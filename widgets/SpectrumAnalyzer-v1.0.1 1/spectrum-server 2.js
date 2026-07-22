/**
 * spectrum-server.js — Spectrum Analyzer Audio Bridge v1
 * Companion to VU Meter audio-server.js — same zero-npm-dependency pattern.
 *
 * Captures system audio via Windows WASAPI loopback (same default output
 * device the volume mixer uses), computes real-time FFT, and serves
 * 64 frequency-bin magnitudes as JSON at:
 *
 *   http://127.0.0.1:3749/fft        → {"bins":[0.00,...,0.00],"peak":0.00}
 *   http://127.0.0.1:3749/debug      → browser debug page (auto-refresh)
 *
 * Usage: node spectrum-server.js
 * Port: 3749  (VU Meter uses 3748 — no conflict)
 */
'use strict';

const http   = require('http');
const { spawn, execSync } = require('child_process');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');

const PORT     = 3749;
const NUM_BINS = 64;
const FFT_SIZE = 2048;

/* Current spectrum state served to widget */
let bins     = new Float32Array(NUM_BINS);
let peakVal  = 0;
const DECAY  = 0.88;

/* ── C# SOURCE — WASAPI loopback capture + FFT ─────────────────────
   Compiled at runtime by csc.exe (ships with .NET Framework 4.x).
   Outputs one line per FFT frame: NUM_BINS space-separated floats.
   ─────────────────────────────────────────────────────────────────── */
const CS_SOURCE = `
using System;
using System.Runtime.InteropServices;
using System.Numerics;
using System.Threading;

namespace SpectrumBridge {

  [ComImport,Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceEnumerator {
    [PreserveSig] int EnumAudioEndpoints(int dataFlow,int dwStateMask,out IntPtr ppDevices);
    [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow,int role,out IMMDevice ppDevice);
  }

  [ComImport,Guid("D666063F-1587-4E43-81F1-B948E807363F"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDevice {
    [PreserveSig] int Activate(ref Guid iid,int dwClsCtx,IntPtr pActivationParams,[MarshalAs(UnmanagedType.IUnknown)]out object ppInterface);
    [PreserveSig] int OpenPropertyStore(int stgmAccess,out IntPtr ppProperties);
    [PreserveSig] int GetId([MarshalAs(UnmanagedType.LPWStr)]out string ppstrId);
    [PreserveSig] int GetState(out int pdwState);
  }

  [ComImport,Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioClient {
    [PreserveSig] int Initialize(int shareMode,int streamFlags,long hnsBufferDuration,long hnsPeriodicity,IntPtr pFormat,IntPtr AudioSessionGuid);
    [PreserveSig] int GetBufferSize(out int pNumBufferFrames);
    [PreserveSig] int GetStreamLatency(out long phnsLatency);
    [PreserveSig] int GetCurrentPadding(out int pNumPaddingFrames);
    [PreserveSig] int IsFormatSupported(int shareMode,IntPtr pFormat,out IntPtr ppClosestMatch);
    [PreserveSig] int GetMixFormat(out IntPtr ppDeviceFormat);
    [PreserveSig] int GetDevicePeriod(out long phnsDefaultDevicePeriod,out long phnsMinimumDevicePeriod);
    [PreserveSig] int Start();
    [PreserveSig] int Stop();
    [PreserveSig] int Reset();
    [PreserveSig] int SetEventHandle(IntPtr eventHandle);
    [PreserveSig] int GetService(ref Guid riid,[MarshalAs(UnmanagedType.IUnknown)]out object ppv);
  }

  [ComImport,Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioCaptureClient {
    [PreserveSig] int GetBuffer(out IntPtr ppData,out int pNumFramesAvailable,out int pdwFlags,out long pu64DevicePosition,out long pu64QPCPosition);
    [PreserveSig] int ReleaseBuffer(int NumFramesRead);
    [PreserveSig] int GetNextPacketSize(out int pNumFramesInNextPacket);
  }

  [ComImport,Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
  class MMDeviceEnumeratorCoClass {}

  [StructLayout(LayoutKind.Sequential,Pack=2)]
  struct WAVEFORMATEX {
    public ushort wFormatTag;
    public ushort nChannels;
    public uint   nSamplesPerSec;
    public uint   nAvgBytesPerSec;
    public ushort nBlockAlign;
    public ushort wBitsPerSample;
    public ushort cbSize;
  }

  class Program {
    static readonly Guid IID_AudioClient  = new Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2");
    static readonly Guid IID_CaptureClient= new Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317");

    const int AUDCLNT_STREAMFLAGS_LOOPBACK = 0x00020000;
    const int AUDCLNT_SHAREMODE_SHARED     = 0;
    const int WAVE_FORMAT_IEEE_FLOAT       = 3;
    const int WAVE_FORMAT_EXTENSIBLE       = 0xFFFE;
    const int AUDCLNT_BUFFERFLAGS_SILENT   = 0x2;

    const int FFT_N    = 2048;
    const int NUM_BINS = 64;
    const float MIN_FREQ = 20f;
    const float MAX_FREQ = 18000f;

    static float[] hannWin  = new float[FFT_N];
    static float[] pcmBuf   = new float[FFT_N];
    static int     pcmPos   = 0;
    static float[] magnitude= new float[FFT_N/2];
    static float[] outBins  = new float[NUM_BINS];
    static float   sampleRate=48000f;

    [STAThread]
    static void Main() {
      // Precompute Hann window
      for(int i=0;i<FFT_N;i++)
        hannWin[i]=0.5f*(1f-(float)Math.Cos(2*Math.PI*i/(FFT_N-1)));

      try {
        var en=(IMMDeviceEnumerator)new MMDeviceEnumeratorCoClass();
        IMMDevice dev;
        int hr=en.GetDefaultAudioEndpoint(0,1,out dev);
        if(hr!=0){Console.Error.WriteLine("ERR:GetDefaultEndpoint="+hr);return;}

        object clientObj;
        Guid iid=IID_AudioClient;
        hr=dev.Activate(ref iid,23,IntPtr.Zero,out clientObj);
        if(hr!=0){Console.Error.WriteLine("ERR:Activate="+hr);return;}

        var client=(IAudioClient)clientObj;
        IntPtr fmtPtr;
        hr=client.GetMixFormat(out fmtPtr);
        if(hr!=0){Console.Error.WriteLine("ERR:GetMixFormat="+hr);return;}

        var fmt=Marshal.PtrToStructure<WAVEFORMATEX>(fmtPtr);
        sampleRate=(float)fmt.nSamplesPerSec;
        int  channels=(int)fmt.nChannels;
        bool isFloat=(fmt.wFormatTag==WAVE_FORMAT_IEEE_FLOAT||fmt.wFormatTag==WAVE_FORMAT_EXTENSIBLE);
        int  bps=(int)fmt.wBitsPerSample;

        Console.Error.WriteLine("READY:sr="+sampleRate+" ch="+channels+" bps="+bps+" float="+isFloat);
        Console.Error.Flush();

        // Use 100ms buffer for loopback
        hr=client.Initialize(AUDCLNT_SHAREMODE_SHARED,AUDCLNT_STREAMFLAGS_LOOPBACK,
                              1000000L,0L,fmtPtr,IntPtr.Zero);
        Marshal.FreeCoTaskMem(fmtPtr);
        if(hr!=0){Console.Error.WriteLine("ERR:Initialize="+hr);return;}

        object capObj;
        Guid capIid=IID_CaptureClient;
        hr=client.GetService(ref capIid,out capObj);
        if(hr!=0){Console.Error.WriteLine("ERR:GetService="+hr);return;}

        var cap=(IAudioCaptureClient)capObj;
        hr=client.Start();
        if(hr!=0){Console.Error.WriteLine("ERR:Start="+hr);return;}

        Console.Error.WriteLine("CAPTURING");Console.Error.Flush();

        for(;;) {
          int pktSize;
          hr=cap.GetNextPacketSize(out pktSize);
          if(hr!=0){Thread.Sleep(2);continue;}

          while(pktSize>0){
            IntPtr pData;int numFrames,flags;long pos,qpc;
            hr=cap.GetBuffer(out pData,out numFrames,out flags,out pos,out qpc);
            if(hr!=0)break;

            bool silent=(flags&AUDCLNT_BUFFERFLAGS_SILENT)!=0;
            int bytesPerFrame=(int)(fmt.nBlockAlign);
            int bytesPerSample=bps/8;

            for(int f=0;f<numFrames;f++){
              float mono=0f;
              if(!silent&&isFloat&&bps==32){
                for(int c=0;c<Math.Min(channels,2);c++){
                  int offset=f*bytesPerFrame+c*bytesPerSample;
                  mono+=Marshal.PtrToStructure<float>(pData+offset);
                }
                mono/=Math.Min(channels,2);
              }
              // Apply Hann window into ring buffer
              pcmBuf[pcmPos]=mono*hannWin[pcmPos];
              pcmPos++;
              if(pcmPos>=FFT_N){
                ComputeFFTAndBins();
                EmitBins();
                // 50% overlap: copy second half to start
                Array.Copy(pcmBuf,FFT_N/2,pcmBuf,0,FFT_N/2);
                pcmPos=FFT_N/2;
              }
            }
            cap.ReleaseBuffer(numFrames);
            cap.GetNextPacketSize(out pktSize);
          }
          Thread.Sleep(2);
        }

      } catch(Exception ex){
        Console.Error.WriteLine("ERR:"+ex.GetType().Name+": "+ex.Message);
      }
    }

    static void ComputeFFTAndBins(){
      // Cooley-Tukey in-place FFT using System.Numerics.Complex
      var data=new Complex[FFT_N];
      for(int i=0;i<FFT_N;i++) data[i]=new Complex(pcmBuf[i],0);

      // Bit-reversal permutation
      int j=0;
      for(int i=1;i<FFT_N;i++){
        int bit=FFT_N>>1;
        for(;(j&bit)!=0;bit>>=1)j^=bit;
        j^=bit;
        if(i<j){var t=data[i];data[i]=data[j];data[j]=t;}
      }
      // FFT butterfly
      for(int len=2;len<=FFT_N;len<<=1){
        double ang=-2*Math.PI/len;
        Complex wlen=new Complex(Math.Cos(ang),Math.Sin(ang));
        for(int ii=0;ii<FFT_N;ii+=len){
          Complex w=Complex.One;
          for(int k=0;k<len/2;k++){
            Complex u=data[ii+k],v=data[ii+k+len/2]*w;
            data[ii+k]=u+v;data[ii+k+len/2]=u-v;
            w*=wlen;
          }
        }
      }
      // Magnitude spectrum (positive half only)
      for(int i=0;i<FFT_N/2;i++)
        magnitude[i]=(float)(data[i].Magnitude/(FFT_N/2));

      // Logarithmic bin grouping: 20 Hz → 18 kHz
      // Then apply dB normalization so output is 0-1 perceptually
      // (-80 dB = 0.0 noise floor, -10 dB = 1.0 loud signal)
      float nyquist=sampleRate/2f;
      for(int b=0;b<NUM_BINS;b++){
        float fLo=(float)(MIN_FREQ*Math.Pow(MAX_FREQ/MIN_FREQ,(double)b/NUM_BINS));
        float fHi=(float)(MIN_FREQ*Math.Pow(MAX_FREQ/MIN_FREQ,(double)(b+1)/NUM_BINS));
        int   lo =Math.Max(0,(int)(fLo/nyquist*(FFT_N/2)));
        int   hi =Math.Min(FFT_N/2-1,(int)(fHi/nyquist*(FFT_N/2)));
        if(hi<lo)hi=lo;
        float sum=0;int cnt=hi-lo+1;
        for(int i=lo;i<=hi;i++) sum+=magnitude[i];
        float avg=cnt>0?sum/cnt:0f;
        // dB perceptual conversion — makes bars fill the screen
        float dB=avg>1e-10f?20f*(float)Math.Log10(avg):-90f;
        outBins[b]=Math.Max(0f,Math.Min(1f,(dB+80f)/70f));
      }
    }

    static void EmitBins(){
      var sb=new System.Text.StringBuilder(NUM_BINS*7);
      for(int i=0;i<NUM_BINS;i++){
        if(i>0)sb.Append(' ');
        sb.Append(outBins[i].ToString("F4"));
      }
      Console.WriteLine(sb.ToString());
      Console.Out.Flush();
    }
  }
}
`;

/* ── Find csc.exe ─────────────────────────────────────────────── */
function findCsc() {
  for (const root of ['C:\\Windows\\Microsoft.NET\\Framework64','C:\\Windows\\Microsoft.NET\\Framework']) {
    try {
      const vers = fs.readdirSync(root).filter(d=>d.startsWith('v')).sort().reverse();
      for (const v of vers) {
        const p = path.join(root,v,'csc.exe');
        if (fs.existsSync(p)) return p;
      }
    } catch {}
  }
  return null;
}

/* ── Compile & run ────────────────────────────────────────────── */
const STAMP  = Date.now();
const tmpDir = os.tmpdir();
const csFile = path.join(tmpDir,'sa_'+STAMP+'.cs');
const exeFile= path.join(tmpDir,'sa_'+STAMP+'.exe');

function start() {
  const csc = findCsc();
  if (!csc) { console.error('❌  csc.exe not found — install .NET Framework 4.x'); return; }
  fs.writeFileSync(csFile, CS_SOURCE, 'utf8');
  console.log('⚙️  Compiling WASAPI capture + FFT bridge...');
  try {
    execSync(`"${csc}" /nologo /reference:System.Numerics.dll /out:"${exeFile}" "${csFile}"`,
             {stdio:'pipe', timeout:30000});
    console.log('✅  Compiled — starting loopback capture');
    runExe();
  } catch(e) {
    console.error('❌  Compile failed:\n' + ((e.stdout||'')+(e.stderr||'')).toString().slice(0,600));
  }
}

/* ── Process spawned C# exe ───────────────────────────────────── */
function runExe() {
  const proc = spawn(exeFile, [], {stdio:['ignore','pipe','pipe'], windowsHide:true});
  let buf='', live=false;

  proc.stdout.on('data', chunk => {
    buf += chunk.toString();
    const lines = buf.split('\n'); buf = lines.pop();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= NUM_BINS) {
        let peak=0;
        for (let i=0; i<NUM_BINS; i++) {
          const v = parseFloat(parts[i]);
          const safe = Number.isFinite(v) ? Math.max(0,v) : 0;
          // Fast attack, slow decay
          bins[i] = safe > bins[i] ? safe : bins[i] * DECAY;
          if (bins[i] > peak) peak = bins[i];
        }
        peakVal = peak;
        if (!live && peak > 0.0005) {
          console.log('🎵  Audio detected! Peak='+peak.toFixed(4));
          live = true;
        }
      }
    }
  });

  proc.stderr.on('data', d => {
    const s = d.toString().trim();
    if      (s.startsWith('READY'))     console.log('✅  WASAPI: '+s.replace('READY:',''));
    else if (s.startsWith('CAPTURING')) console.log('🎤  Loopback capture active');
    else if (s.startsWith('ERR'))       console.error('❌  '+s);
  });

  proc.on('close', code => {
    if (code) console.log('⚠️  Capture exited ('+code+'), restarting in 3s...');
    bins.fill(0); peakVal=0; live=false;
    setTimeout(runExe, 3000);
  });
  proc.on('error', err => console.error('spawn:', err.message));
}

/* ── HTTP server ──────────────────────────────────────────────── */
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','no-cache');
  if (req.method==='OPTIONS'){res.writeHead(204);res.end();return;}

  if (req.url==='/fft'||req.url==='/') {
    res.writeHead(200,{'Content-Type':'application/json'});
    const arr = Array.from(bins).map(v=>+v.toFixed(5));
    res.end(JSON.stringify({bins:arr,peak:+peakVal.toFixed(5),bins_count:NUM_BINS}));
    return;
  }

  if (req.url==='/debug') {
    const active = peakVal > 0.002;
    const barRows = Array.from(bins).map((v,i)=>{
      const pct = Math.min(100,v*800).toFixed(0);
      const freq = (20*Math.pow(18000/20,i/NUM_BINS)).toFixed(0);
      return `<div style="display:inline-block;margin:1px;vertical-align:bottom">
        <div style="width:8px;height:${pct}px;background:hsl(${Math.floor(i/NUM_BINS*280)},100%,55%);min-height:1px"></div>
        </div>`;
    }).join('');
    res.writeHead(200,{'Content-Type':'text/html'});
    res.end(`<!DOCTYPE html><html><body style="font:14px monospace;padding:20px;background:#111;color:#eee">
<h2 style="color:#fff">Spectrum Bridge v1 — Port ${PORT}</h2>
<p style="color:${active?'#0f0':'#f55'};font-size:20px">${active?'✅ Audio active  Peak='+peakVal.toFixed(4):'❌ No audio — play something'}</p>
<div style="display:flex;align-items:flex-end;height:120px;border-bottom:1px solid #333;margin:12px 0">${barRows}</div>
<p style="color:#888;font-size:12px">${NUM_BINS} log-spaced bins · 20Hz → 18kHz · FFT N=${2048}</p>
<script>setTimeout(()=>location.reload(),300)</script></body></html>`);
    return;
  }

  res.writeHead(404); res.end();
});

server.listen(PORT,'127.0.0.1',()=>{
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  Spectrum Analyzer Bridge v1               ║');
  console.log(`║  FFT:   http://127.0.0.1:${PORT}/fft          ║`);
  console.log(`║  Debug: http://127.0.0.1:${PORT}/debug        ║`);
  console.log('╚════════════════════════════════════════════╝\n');
  start();
});

process.on('SIGINT', ()=>{server.close();process.exit(0);});
process.on('SIGTERM',()=>{server.close();process.exit(0);});

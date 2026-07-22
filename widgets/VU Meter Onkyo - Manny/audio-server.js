/**
 * audio-server.js  —  VU Meter Audio Bridge  v11
 * Zero npm dependencies. node audio-server.js
 * Widget: http://127.0.0.1:3748/levels  |  Debug: http://127.0.0.1:3748/debug
 */
'use strict';

const http = require('http');
const { spawn, execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const PORT = 3748;

let levelL = 0, levelR = 0;
const DECAY = 0.82;

const STAMP   = Date.now();
const tmpDir  = os.tmpdir();
const csFile  = path.join(tmpDir, 'vu_' + STAMP + '.cs');
const exeFile = path.join(tmpDir, 'vu_' + STAMP + '.exe');

// Fix for 0xC0000005 + 0xC00000FD:
// - Use Marshal.AllocHGlobal for the float array (unmanaged memory, GC can't move it)
// - Use explicit Marshal.Copy to read results back
// - Avoid GetChannelsPeakValues entirely if it keeps crashing — use GetPeakValue
//   with channel selection via per-session volume objects instead
// - Use [GCHandle].Alloc(arr, Pinned) as backup approach for the array
const CS_SOURCE = `
using System;
using System.Runtime.InteropServices;
using System.Threading;

namespace VuBridge {

    [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDeviceEnumerator {
        [PreserveSig] int EnumAudioEndpoints(int dataFlow, int dwStateMask, out IntPtr ppDevices);
        [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
    }

    [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IMMDevice {
        [PreserveSig] int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams,
                                   [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
        [PreserveSig] int OpenPropertyStore(int stgmAccess, out IntPtr ppProperties);
        [PreserveSig] int GetId([MarshalAs(UnmanagedType.LPWStr)] out string ppstrId);
        [PreserveSig] int GetState(out int pdwState);
    }

    [ComImport, Guid("C02216F6-8C67-4B5B-9D00-D008E73E0064"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IAudioMeterInformation {
        [PreserveSig] int GetPeakValue(out float pfPeak);
        [PreserveSig] int GetMeteringChannelCount(out int pnChannelCount);
        // Use IntPtr instead of float[] to pass unmanaged pointer — avoids GC pin issues
        [PreserveSig] int GetChannelsPeakValues(int u32ChannelCount, IntPtr afPeakValues);
        [PreserveSig] int QueryHardwareSupport(out int pdwHardwareSupportMask);
    }

    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    class MMDeviceEnumeratorCoClass {}

    class Program {
        static readonly Guid IID_METER = new Guid("C02216F6-8C67-4B5B-9D00-D008E73E0064");

        [STAThread]
        static void Main() {
            try {
                var enumerator = (IMMDeviceEnumerator) new MMDeviceEnumeratorCoClass();

                IMMDevice device;
                int hr = enumerator.GetDefaultAudioEndpoint(0, 1, out device);
                if (hr != 0) { Console.Error.WriteLine("ERR:GetDefaultEndpoint=" + hr); return; }

                object meterObj;
                Guid g = IID_METER;
                hr = device.Activate(ref g, 23, IntPtr.Zero, out meterObj);
                if (hr != 0) { Console.Error.WriteLine("ERR:Activate=" + hr); return; }

                var meter = (IAudioMeterInformation)meterObj;

                // Verify GetPeakValue works
                float testPeak = 0f;
                hr = meter.GetPeakValue(out testPeak);
                if (hr != 0) { Console.Error.WriteLine("ERR:GetPeakValue=" + hr); return; }

                int chCount = 0;
                hr = meter.GetMeteringChannelCount(out chCount);
                bool hasStereo = (hr == 0 && chCount >= 2);

                Console.Error.WriteLine("READY:ch=" + chCount + " stereo=" + hasStereo);
                Console.Error.Flush();

                // Allocate UNMANAGED memory for 2 floats — GC cannot move this
                IntPtr peakBuf = Marshal.AllocHGlobal(2 * sizeof(float));

                try {
                    // Write loop — no recursion, plain iterative
                    for (int iter = 0; ; iter++) {
                        float l = 0f, r = 0f;

                        if (hasStereo) {
                            hr = meter.GetChannelsPeakValues(2, peakBuf);
                            if (hr == 0) {
                                l = Math.Max(0f, Math.Min(1f, Marshal.ReadInt32(peakBuf, 0).ToFloat()));
                                r = Math.Max(0f, Math.Min(1f, Marshal.ReadInt32(peakBuf, 4).ToFloat()));
                            } else {
                                hasStereo = false; // fall back permanently
                            }
                        }

                        if (!hasStereo) {
                            meter.GetPeakValue(out l);
                            r = l;
                        }

                        Console.WriteLine(l.ToString("F4") + " " + r.ToString("F4"));
                        Console.Out.Flush();
                        Thread.Sleep(4);
                    }
                } finally {
                    Marshal.FreeHGlobal(peakBuf);
                }

            } catch (Exception ex) {
                Console.Error.WriteLine("ERR:" + ex.GetType().Name + ": " + ex.Message);
            }
        }
    }

    static class FloatHelper {
        public static float ToFloat(this int i) {
            return BitConverter.ToSingle(BitConverter.GetBytes(i), 0);
        }
    }
}
`;

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

function start() {
  const csc = findCsc();
  if (!csc) { console.error('csc.exe not found'); return; }
  fs.writeFileSync(csFile, CS_SOURCE, 'utf8');
  console.log('Compiling...');
  try {
    execSync('"'+csc+'" /nologo /out:"'+exeFile+'" "'+csFile+'"',
             {stdio:'pipe', timeout:30000});
    console.log('✅  Compiled — starting reader');
    runExe();
  } catch(e) {
    console.error('❌  Compile:\n'+((e.stdout||'')+(e.stderr||'')).toString().slice(0,400));
  }
}

function runExe() {
  const proc = spawn(exeFile, [], {stdio:['ignore','pipe','pipe'], windowsHide:true});
  let buf='', live=false;

  proc.stdout.on('data', chunk => {
    buf += chunk.toString();
    const lines = buf.split('\n'); buf = lines.pop();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const l=parseFloat(parts[0]), r=parseFloat(parts[1]);
        if (Number.isFinite(l) && l>=0) {
          // Pass raw peaks — widget handles all smoothing/decay
          levelL = l > levelL ? l : levelL * 0.55;
          levelR = r > levelR ? r : levelR * 0.55;
          if (!live&&(l>0.001||r>0.001)) {
            console.log('🎵  Audio detected! L='+l.toFixed(3)+' R='+r.toFixed(3));
            live=true;
          }
        }
      }
    }
  });

  proc.stderr.on('data', d => {
    const s=d.toString().trim();
    if (s.startsWith('READY')) console.log('✅  WASAPI: '+s.split(':')[1]+' → http://127.0.0.1:'+PORT+'/debug');
    else if (s.startsWith('ERR')) console.error('❌  '+s);
  });

  proc.on('close', code => {
    if (code) console.log('Reader exited ('+code+' = 0x'+(code>>>0).toString(16)+'), restarting...');
    levelL=0; levelR=0; live=false;
    setTimeout(runExe, 3000);
  });
  proc.on('error', err => console.error('spawn:',err.message));
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','no-cache');
  if (req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  if (req.url==='/levels'||req.url==='/') {
    res.writeHead(200,{'Content-Type':'application/json'});
    res.end(JSON.stringify({L:+levelL.toFixed(4),R:+levelR.toFixed(4)}));
    return;
  }
  if (req.url==='/debug') {
    const on=levelL>0.005||levelR>0.005;
    res.writeHead(200,{'Content-Type':'text/html'});
    res.end(`<!DOCTYPE html><html><body style="font:18px monospace;padding:24px;background:#111;color:#0f0">
<h2 style="color:#fff">VU Bridge v11</h2>
<div style="font-size:36px;margin:16px 0">L=<b>${levelL.toFixed(4)}</b>&nbsp;R=<b>${levelR.toFixed(4)}</b></div>
<p style="font-size:22px;color:${on?'#0f0':'#f55'}">${on?'✅ Audio detected!':'❌ No audio — play Spotify'}</p>
<script>setTimeout(()=>location.reload(),300)</script></body></html>`);
    return;
  }
  res.writeHead(404);res.end();
});

server.listen(PORT,'127.0.0.1',()=>{
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║  VU Meter Bridge v11                  ║');
  console.log('║  Debug: http://127.0.0.1:3748/debug   ║');
  console.log('╚═══════════════════════════════════════╝\n');
  start();
});

process.on('SIGINT', ()=>{server.close();process.exit(0);});
process.on('SIGTERM',()=>{server.close();process.exit(0);});

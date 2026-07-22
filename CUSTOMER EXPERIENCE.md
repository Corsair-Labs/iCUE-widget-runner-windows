# Customer Experience

## What the App Does

iCUE Widget Runner Engine brings browser-style CORSAIR iCUE widgets to Windows.
It discovers compatible widgets stored on the PC, presents them in a simple
launcher, and runs the selected experience in an Electron window or Chrome app
mode. An iCUE compatibility layer helps supported widgets operate outside the
full desktop iCUE runtime, while optional local audio bridges enable live VU
meters and spectrum analyzers.

## Use Case Scenario

A customer may have a Windows PC connected to a XENEON EDGE or another
secondary display as part of a desk, gaming room, streaming station, workshop,
or home-entertainment setup. After starting the runner, the customer can browse
the available widgets and select an experience such as an audio visualizer,
clock face, air-quality display, calendar, or drawing surface. The display can
provide always-available information or ambient visuals without occupying the
primary screen.

The runner is also useful for prototyping. Designers and developers can place a
compatible web widget in the local `widgets\` folder, launch it in the runner,
and evaluate its appearance, interaction model, performance, and suitability
for a compact or touch-enabled display.

## Who It Is For

This project may be useful to:

- CORSAIR and iCUE enthusiasts experimenting with new widget experiences.
- Windows users who want a dedicated dashboard or ambient secondary display.
- Gamers, streamers, creators, and PC builders who want system-adjacent visuals.
- Widget designers and web developers who need a lightweight test environment.
- Early adopters comfortable evaluating experimental software and giving
  feedback.

## Operating System Compatibility

Windows 10 and Windows 11 are the intended platforms. The primary experience
uses the locally installed Electron runtime; Chrome app mode is available as a
fallback and for browser-specific testing. Other operating systems are outside
the scope of this Windows launcher and its WASAPI audio bridges.

Audio-reactive widgets require a working default Windows audio output and the
.NET Framework 4.x C# compiler used to build the local WASAPI capture helper.
Compatibility can vary with audio drivers, endpoint configuration, corporate
security policy, and Windows installation state. Widgets that retrieve live
information also require network access.

## Customer Experience

The intended experience is exploratory, visual, and approachable. Customers
should be able to launch the app, understand which widgets are available,
preview one, and begin using it with minimal setup. Widget names, icons,
metadata, status information, and saved settings make the collection feel
organized and persistent. Electron provides the primary desktop-like,
frameless experience, while Chrome app mode provides a practical fallback.

Some capabilities depend on the PC configuration. Audio-reactive widgets need
working WASAPI loopback capture, and live-information widgets may need internet
access. Status indicators, simulated fallback behavior, local debug endpoints,
and setup guidance are therefore important parts of the experience. Because
this is preview software, customers should expect experiments, changing
behavior, and features that may not become part of a future iCUE release.

## Technical Experience

The application uses Node.js, a loopback-only local web server, and Electron or
Chrome to host HTML-based widgets. It scans for widget folders containing an
`index.html`, reads optional manifest information, and loads each widget in an
isolated frame. The runner injects iCUE-style globals and sensor-provider
compatibility behavior so supported widgets can run in the preview environment
without depending on the full iCUE desktop runtime for hosting.

For audio-reactive widgets, local bridge services compile a small C# helper and
use Windows WASAPI loopback to capture the default output. They expose VU level
or FFT spectrum data through local endpoints on ports `3748` and `3749`. Runner
settings are retained in browser local storage. Developers can add permanent
widgets to `widgets\` or temporarily load a widget for evaluation through the
browser interface.

## Vision for CORSAIR Labs

This app is suitable for publication in a CORSAIR Labs GitHub repository: a
home for internal-use tools, early-access previews, experimental widgets, and
prototypes that explore ideas beyond current official iCUE releases. These
projects may preview concepts that could inform future iCUE features, unlock
specialized workflows, or investigate experiences not officially supported by
iCUE today.

CORSAIR Labs can serve as an open workshop between CORSAIR creators and the
community—a place where useful ideas are shared earlier, tested in real
environments, and improved through practical feedback. Publishing experiments
clearly and accessibly can help enthusiasts explore emerging concepts and help
teams learn which experiences provide genuine customer value before decisions
about broader product integration are made.

Projects in CORSAIR Labs should be treated as experimental previews rather than
supported CORSAIR products. Availability does not promise inclusion in iCUE,
continued development, warranty coverage, or technical support. Users should
review this project's requirements, [DISCLAIMER NOTICE](DISCLAIMER%20NOTICE),
and [LICENSE](LICENSE) before use. The standard MIT License permits commercial
and non-commercial use of the software subject to its notice-preservation
condition; it does not grant trademark rights or permission to imply CORSAIR
endorsement.

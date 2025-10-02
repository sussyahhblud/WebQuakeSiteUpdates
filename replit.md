# WebQuake - Replit Project

## Overview
WebQuake is an HTML5 WebGL port of the classic Quake game by id Software. This project includes both a web client that runs in browsers and a Node.js dedicated server for multiplayer functionality.

## Architecture
- **Frontend**: HTML5/WebGL client located in `Client/` directory
- **Server**: Node.js dedicated game server in `Server/` directory  
- **HTTP Server**: Custom Node.js server (`webquake-server.js`) serves frontend on port 5000
- **Game Server**: Dedicated Quake server runs on port 26000 for multiplayer

## Current State (October 2, 2025 - Fresh Clone Setup Complete)
✅ **Successfully Re-imported and Configured for Replit**
- Fresh clone from GitHub successfully set up in Replit environment
- Node.js environment configured with required dependencies (adm-zip, websocket)
- HTTP server configured to serve WebQuake client on port 5000 with proper host binding (0.0.0.0)
- Proper MIME types and cache control headers configured for Replit environment
- CORS enabled and caching disabled for development compatibility
- Workflow "WebQuake Server" configured and running successfully on port 5000
- Dependencies installed for both main project and Server directory (npm install completed)
- Deployment configured for production (autoscale deployment with node webquake-server.js)
- WebQuake launcher interface loads and displays correctly with Quake logo
- All tests passed: server running, frontend accessible, no errors
- Screenshot verified: launcher UI displays properly with all sections visible

✅ **Launcher Interface**
- Left sidebar with collapsible sections: GAMES, LAUNCH OPTIONS, SITE PREFERENCES, START
- Dark theme styling with professional aesthetic
- Quake logo displayed in center (default color: rgb(104, 61, 44))
- Footer with links: Instructions | GitHub | Half-Life
- Fullscreen toggle option available
- Integrated download overlay for game data

✅ **UI Customization Features**
- **Custom Background**: Toggle and RGB sliders to customize the launcher background color
- **Custom Sidebar**: Toggle and RGB sliders to customize sidebar color
  - Dropdown buttons automatically offset brighter (+20 RGB) than sidebar for visual distinction
- **Custom Logo Color**: Toggle and RGB sliders to colorize the entire Quake logo
  - Default logo color: rgb(104, 61, 44)
  - Real-time color preview boxes for all customization options
  - Number inputs (0-255) for precise RGB control
  - Reset buttons to restore defaults
- **Persistent Settings**: All customization preferences saved to localStorage
- **Independent Controls**: Checkbox-based system allows simultaneous use of multiple customizations
- **Default Quake Background**: Classic Quake themed background displays when custom background is disabled

⚠️ **Known Limitations**
- Download URLs for Quake data files may need updating (original URLs return 404)
- Updated to use alternative sources: GitHub, quaddicted.com, archive.org mirrors
- Users can manually add Quake data files to `Client/id1/` directory if download fails

## Setup Details
- Frontend accessible at: `http://localhost:5000`
- Game server (multiplayer): port 26000
- HTTP server includes range request support for better compatibility
- CORS enabled and caching disabled for development

## CORS Bypass & Network Protection
✅ **Advanced Download System**
- **Multiple fallback URLs**: Automatic failover between download sources to bypass network blocks
- **Server-side proxy**: Downloads handled server-side to completely bypass CORS restrictions
- **Smart redirect handling**: Follows redirects automatically with proper User-Agent headers
- **Secure proxy endpoint**: `/api/proxy?url=<encoded_url>` with domain whitelist and SSRF protection
  - Whitelisted domains: dropbox.com, dropboxusercontent.com, archive.org, github.com, githubusercontent.com, cdn.cloudflare.net, cloudinary.com
  - Blocks private/internal IP addresses to prevent security exploits
  - 30-second timeout and 100MB size limit for safety
- **Network resilience**: Retries with alternative sources if primary URL fails

## Game Controls & Input
✅ **Custom Controls Implementation**
- **ESC Hold to Exit**: ESC key now requires holding for 0.5 seconds to open menu/exit fullscreen (prevents accidental exits)
- **WASD Movement**: Modern FPS controls automatically configured
  - W = Move Forward
  - S = Move Backward
  - A = Strafe Left
  - D = Strafe Right
- **Mouse Look Enabled**: +mlook command executed automatically on startup for mouse-based aiming

## File Structure
```
/
├── Client/                 # WebQuake browser client
│   ├── index.htm          # Main game HTML file
│   └── WebQuake/          # Game engine JavaScript files
├── Server/                # Node.js dedicated game server
│   ├── WebQDS.js         # Main server entry point
│   └── WebQDS/           # Server-side game engine
├── webquake-server.js    # HTTP server for frontend (port 5000)
└── README.md             # Original project documentation
```

## Usage Notes
- To fully run the game, users need to provide Quake data files (id1 folder)
- The shareware version with first episode is sufficient for basic testing
- Multiplayer requires running the dedicated server: `cd Server && node WebQDS.js`
- Web client connects to multiplayer via WebSocket on port 26000

## Deployment
- ✅ Configured for Replit autoscale deployment
- Production command: `node webquake-server.js`
- Serves static files with proper HTTP headers and range support
- Ready for publishing when user is satisfied with functionality
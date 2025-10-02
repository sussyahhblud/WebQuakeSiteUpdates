window.downloadQuakeData = async function() {
    const button = document.getElementById("downloadButton");
    const status = document.getElementById("downloadStatus");
    
    button.disabled = true;
    status.innerHTML = "Downloading Quake data...";
    status.style.color = "#e1e1e1";
    
    try {
        const response = await fetch("/api/download-quake", { method: "POST" });
        
        if (response.status === 200) {
            status.innerHTML = "Download complete! Starting game...";
            status.style.color = "#90EE90";
            
            // Notify the launcher that download is complete
            setTimeout(() => {
                if (window.onDownloadComplete) {
                    window.onDownloadComplete();
                }
            }, 1000);
            
        } else if (response.status === 409) {
            status.innerHTML = "Quake data already exists! Click to start game...";
            status.style.color = "#FFD700";
            
            // Re-enable the button so user can click to start
            button.disabled = false;
            button.innerHTML = "Start Game";
            
            // Only start game when user clicks the button again
            button.onclick = () => {
                if (window.onDownloadComplete) {
                    window.onDownloadComplete();
                }
            };
        } else {
            const errorText = await response.text();
            status.innerHTML = "Download failed: " + errorText;
            status.style.color = "#FF6B6B";
            button.disabled = false;
        }
    } catch (error) {
        status.innerHTML = "Download failed: " + error.message;
        status.style.color = "#FF6B6B";
        button.disabled = false;
    }
};

// Function to load WebQuake engine scripts dynamically
function loadQuakeEngine() {
    return new Promise((resolve) => {
        const scripts = [
            'WebQuake/CDAudio.js', 'WebQuake/Chase.js', 'WebQuake/CL.js', 'WebQuake/Cmd.js',
            'WebQuake/COM.js', 'WebQuake/Console.js', 'WebQuake/CRC.js', 'WebQuake/Cvar.js',
            'WebQuake/Def.js', 'WebQuake/Draw.js', 'WebQuake/ED.js', 'WebQuake/GL.js',
            'WebQuake/Host.js', 'WebQuake/IN.js', 'WebQuake/Key.js', 'WebQuake/M.js',
            'WebQuake/Mod.js', 'WebQuake/MSG.js', 'WebQuake/NET.js', 'WebQuake/NET_Loop.js',
            'WebQuake/NET_WEBS.js', 'WebQuake/PF.js', 'WebQuake/PR.js', 'WebQuake/Protocol.js',
            'WebQuake/Q.js', 'WebQuake/R.js', 'WebQuake/S.js', 'WebQuake/Sbar.js',
            'WebQuake/SCR.js', 'WebQuake/SV.js', 'WebQuake/Sys.js', 'WebQuake/SZ.js',
            'WebQuake/V.js', 'WebQuake/Vec.js', 'WebQuake/VID.js', 'WebQuake/W.js'
        ];
        
        let loadedCount = 0;
        scripts.forEach(src => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                loadedCount++;
                if (loadedCount === scripts.length) {
                    resolve();
                }
            };
            document.head.appendChild(script);
        });
    });
}

// Function to initialize Quake after successful download or when data exists
window.initializeQuake = async function() {
    console.log('Loading Quake engine...');
    
    // Load engine scripts dynamically
    await loadQuakeEngine();
    
    console.log('Initializing Quake engine...');
    
    // Initialize the full game now that scripts are loaded
    if (typeof Sys !== 'undefined' && Sys.InitFullGame) {
        Sys.InitFullGame();
    } else {
        console.log('Quake engine not yet loaded, will retry...');
        // Retry after a short delay if Sys is not yet available
        setTimeout(() => {
            if (typeof Sys !== 'undefined' && Sys.InitFullGame) {
                Sys.InitFullGame();
            }
        }, 1000);
    }
};

// Check if game data exists when page loads
window.checkForGameData = function() {
    return fetch('/id1/pak0.pak', { method: 'HEAD' })
        .then(function(response) {
            return response.ok;
        })
        .catch(function() {
            return false;
        });
};

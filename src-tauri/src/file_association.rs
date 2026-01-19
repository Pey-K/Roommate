// File association registration for Windows
#[cfg(all(windows, feature = "windows-registry"))]
use winreg::enums::*;
#[cfg(all(windows, feature = "windows-registry"))]
use winreg::RegKey;

#[cfg(all(windows, feature = "windows-registry"))]
pub fn register_roo_file_association() -> Result<(), String> {
    use std::env;
    
    // Get the executable path
    let exe_path = env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;
    
    let exe_path_str = exe_path.to_string_lossy().replace('/', "\\");
    
    // Try to find icon in multiple locations (dev vs production)
    let icon_path = {
        let exe_dir = exe_path.parent()
            .ok_or("Failed to get executable directory")?;
        
        // Try production path first (icons next to exe)
        let prod_path = exe_dir.join("icons").join("roo-key.ico");
        if prod_path.exists() {
            prod_path
        } else {
            // Try dev path (src-tauri/icons relative to exe)
            // In dev, exe is typically in target/debug/roommate.exe
            // So we go: target/debug -> target -> project root -> src-tauri/icons
            let dev_path = exe_dir
                .parent()  // target/debug -> target
                .and_then(|p| p.parent())  // target -> project root
                .map(|p| p.join("src-tauri").join("icons").join("roo-key.ico"));
            
            if let Some(dev_path) = dev_path {
                if dev_path.exists() {
                    dev_path
                } else {
                    return Err(format!("roo-key.ico not found. Tried: {} and {}. Please run: npm run generate-roo-icon", 
                        prod_path.display(), dev_path.display()));
                }
            } else {
                return Err(format!("roo-key.ico not found. Tried: {}. Please run: npm run generate-roo-icon", 
                    prod_path.display()));
            }
        }
    };
    
    let icon_path_str = icon_path.to_string_lossy().replace('/', "\\");
    
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    
    // Register .roo file extension
    let (roo_ext, _) = hkcu.create_subkey("Software\\Classes\\.roo")
        .map_err(|e| format!("Failed to create .roo key: {}", e))?;
    roo_ext.set_value("", &"Roommate.Export")
        .map_err(|e| format!("Failed to set .roo default value: {}", e))?;
    
    // Register Roommate.Export file type
    let (file_type, _) = hkcu.create_subkey("Software\\Classes\\Roommate.Export")
        .map_err(|e| format!("Failed to create Roommate.Export key: {}", e))?;
    file_type.set_value("", &"Roommate Export File")
        .map_err(|e| format!("Failed to set file type description: {}", e))?;
    
    // Set default icon
    let (default_icon, _) = file_type.create_subkey("DefaultIcon")
        .map_err(|e| format!("Failed to create DefaultIcon key: {}", e))?;
    default_icon.set_value("", &format!("{},0", icon_path_str))
        .map_err(|e| format!("Failed to set icon path: {}", e))?;
    
    // Register open command
    let (shell, _) = file_type.create_subkey("shell")
        .map_err(|e| format!("Failed to create shell key: {}", e))?;
    shell.set_value("", &"open")
        .map_err(|e| format!("Failed to set shell default: {}", e))?;
    
    let (open, _) = shell.create_subkey("open")
        .map_err(|e| format!("Failed to create open key: {}", e))?;
    open.set_value("", &"Import Identity File")
        .map_err(|e| format!("Failed to set open description: {}", e))?;
    
    let (command, _) = open.create_subkey("command")
        .map_err(|e| format!("Failed to create command key: {}", e))?;
    command.set_value("", &format!("\"{}\" \"%1\"", exe_path_str))
        .map_err(|e| format!("Failed to set command: {}", e))?;
    
    // Note: File association changes may require a logoff/login or explorer restart to take effect
    // We could use SHChangeNotify to notify Windows, but it requires additional winapi features
    // For now, the registry changes will take effect after user logs out/in or restarts explorer
    
    Ok(())
}

#[cfg(not(all(windows, feature = "windows-registry")))]
pub fn register_roo_file_association() -> Result<(), String> {
    Err("File association registration is only supported on Windows with windows-registry feature".to_string())
}

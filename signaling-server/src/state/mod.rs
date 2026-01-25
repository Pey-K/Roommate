pub mod signaling;
pub mod voice;
pub mod presence;
pub mod profiles;
pub mod events;
pub mod backends;

pub use signaling::SignalingState;
pub use voice::VoiceState;
pub use presence::PresenceState;
pub use profiles::ProfileState;
pub use events::EventState;
pub use backends::BackendState;

use std::sync::Arc;
use tokio::sync::Mutex;

/// Main application state wrapping all subsystems.
/// Each subsystem has its own Mutex to reduce contention.
/// Start with Mutex everywhere. Only consider upgrading to RwLock after Phase 3 if profiling shows read-heavy contention.
pub struct AppState {
    pub signaling: Arc<Mutex<SignalingState>>,
    pub voice: Arc<Mutex<VoiceState>>,
    pub presence: Arc<Mutex<PresenceState>>,
    pub profiles: Arc<Mutex<ProfileState>>,
    pub events: Arc<Mutex<EventState>>,
    pub backends: Arc<Mutex<BackendState>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            signaling: Arc::new(Mutex::new(SignalingState::new())),
            voice: Arc::new(Mutex::new(VoiceState::new())),
            presence: Arc::new(Mutex::new(PresenceState::new())),
            profiles: Arc::new(Mutex::new(ProfileState::new())),
            events: Arc::new(Mutex::new(EventState::new())),
            backends: Arc::new(Mutex::new(BackendState::new())),
        }
    }
}

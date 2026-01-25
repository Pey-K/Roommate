use std::collections::HashMap;
use crate::{ConnId, PresenceConn, PresenceUser};

/// Presence state (user ↔ house)
pub struct PresenceState {
    pub presence_conns: HashMap<ConnId, PresenceConn>,
    pub presence_users: HashMap<String, PresenceUser>,
}

impl PresenceState {
    pub fn new() -> Self {
        Self {
            presence_conns: HashMap::new(),
            presence_users: HashMap::new(),
        }
    }
}

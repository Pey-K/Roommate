use std::collections::HashMap;
use crate::ProfileRecord;

/// Profile replication state
pub struct ProfileState {
    /// Latest profile metadata per user (no media)
    pub profiles: HashMap<String, ProfileRecord>,
}

impl ProfileState {
    pub fn new() -> Self {
        Self {
            profiles: HashMap::new(),
        }
    }
}

use std::collections::HashMap;
use crate::{SigningPubkey, EncryptedHouseHint, InviteTokenRecord, HouseEvent};

/// Event queue state (REST API)
/// Hints only - clients treat local state as authoritative
pub struct EventState {
    /// Hints only - clients treat local state as authoritative
    pub house_hints: HashMap<SigningPubkey, EncryptedHouseHint>,
    /// Temporary invite tokens (short code -> encrypted payload)
    pub invite_tokens: HashMap<String, InviteTokenRecord>,
    /// Event queue - time-limited, not consensus-based
    /// Best-effort sync - timestamp collisions possible
    pub event_queues: HashMap<SigningPubkey, Vec<HouseEvent>>,
    /// Best-effort acks - soft tracking, not hard requirement
    pub member_acks: HashMap<(SigningPubkey, String), String>, // (signing_pubkey, user_id) -> last_event_id
}

impl EventState {
    pub fn new() -> Self {
        Self {
            house_hints: HashMap::new(),
            invite_tokens: HashMap::new(),
            event_queues: HashMap::new(),
            member_acks: HashMap::new(),
        }
    }
}

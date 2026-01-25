use std::collections::HashMap;
use crate::{HouseId, SigningPubkey, VoicePeer};

/// Voice chat state (room-scoped)
pub struct VoiceState {
    /// Map of (house_id, room_id) -> list of VoicePeers in that room
    /// Room peer list may need indexing (HashMap<PeerId, VoicePeer>) if churn increases.
    pub voice_rooms: HashMap<(HouseId, String), Vec<VoicePeer>>,
    /// Map of house_id -> signing_pubkey (for voice presence broadcasting)
    pub house_signing_pubkeys: HashMap<HouseId, SigningPubkey>,
}

impl VoiceState {
    pub fn new() -> Self {
        Self {
            voice_rooms: HashMap::new(),
            house_signing_pubkeys: HashMap::new(),
        }
    }
}

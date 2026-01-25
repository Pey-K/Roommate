#[cfg(feature = "postgres")]
use sqlx::PgPool;
#[cfg(feature = "redis-backend")]
use redis::Client;

/// Backend state (db, redis)
pub struct BackendState {
    #[cfg(feature = "postgres")]
    pub db: Option<PgPool>,
    #[cfg(feature = "redis-backend")]
    pub redis: Option<Client>,
    #[cfg(feature = "redis-backend")]
    pub redis_presence_ttl_secs: u64,
}

impl BackendState {
    pub fn new() -> Self {
        Self {
            #[cfg(feature = "postgres")]
            db: None,
            #[cfg(feature = "redis-backend")]
            redis: None,
            #[cfg(feature = "redis-backend")]
            redis_presence_ttl_secs: 120, // Matches DEFAULT_REDIS_PRESENCE_TTL_SECS in main.rs
        }
    }
}

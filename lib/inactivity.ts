export const INACTIVITY_TIMEOUT_MS=5*60*1000;
export const INACTIVITY_STORAGE_KEY='budgetos:last-activity:v1';

export function inactivityExpired(lastActivity:number,now=Date.now(),timeout=INACTIVITY_TIMEOUT_MS){
 return !Number.isFinite(lastActivity)||now-lastActivity>=timeout;
}

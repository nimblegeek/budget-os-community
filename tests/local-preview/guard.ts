export function localHost(host:string|null){return host==='127.0.0.1:3010'||host==='localhost:3010';}
export function localOrigin(origin:string|null,host:string|null){return localHost(host)&&origin===`http://${host}`;}

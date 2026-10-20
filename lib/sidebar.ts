export const sidebarStorageKey='budget-os-sidebar-collapsed';
export function isSidebarShortcut(event:{key:string;metaKey:boolean;ctrlKey:boolean;altKey:boolean;shiftKey:boolean;repeat:boolean;defaultPrevented:boolean},desktop:boolean,editing:boolean) {
 return desktop&&!editing&&!event.defaultPrevented&&!event.repeat&&!event.altKey&&!event.shiftKey&&(event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='b';
}

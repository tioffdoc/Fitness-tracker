let _goto = (id)=>console.warn("navigator not ready", id);
export function setNavigator(fn){ _goto = fn; }
export function navigateTo(id){ _goto(id); }

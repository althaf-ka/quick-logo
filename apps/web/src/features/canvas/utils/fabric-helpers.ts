let idCounter = 0;
export const generateId = () => `obj_${Date.now()}_${idCounter++}`;

export const removeGid = (gid) => {
    const match = gid.match(/(\d+)$/);
    return match ? match[0] : null;
 };
 
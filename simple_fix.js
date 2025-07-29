// Fix undefined bitProfile
const orig = RouterBitSystem.prototype.showBitSizeSelector;
RouterBitSystem.prototype.showBitSizeSelector = function(bitProfile) {
    if (!bitProfile) {
        bitProfile = { name: 'Imported Router Bit', sizes: ['0.25'] };
    }
    return orig.call(this, bitProfile);
};
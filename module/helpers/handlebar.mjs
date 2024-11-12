export function headerFieldWidget(field, _groupConfig, inputConfig) {
    const fg = document.createElement("div");
    fg.className = "resource flex-group-center";
    fg.innerHTML = `field: ${field}`;
    return fg;
}
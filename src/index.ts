import { NVRCard } from "./card";

declare global {
  interface Window {
    customCards: Array<Object>;
  }
}

customElements.define("nvr-card", NVRCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "nvr-card",
  name: "NVR Card",
  description: "Display Recordings from Media Source",
});

import { html, LitElement, TemplateResult, nothing, svg, PropertyValueMap } from "lit";
import { styles } from "./card.styles";
import { state, customElement} from "lit/decorators"
import { classMap } from "lit/directives/class-map"
import { styleMap } from "lit/directives/style-map"

import { HassEntity } from "home-assistant-js-websocket";
import { HomeAssistant, LovelaceCardConfig } from "custom-card-helpers";

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat'

import { DigitalPTZ } from './digital-ptz'
import { BrowseMedia } from './media-types'

dayjs.extend(customParseFormat);

declare global {
  interface Window {
    customCards: Array<Object>;
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "nvr-card",
  name: "NVR Card",
  description: "Display Recordings from Media Source",
});

interface Config extends LovelaceCardConfig {
  header: string;
  entity: string;
  start_at: number;
}

interface PlayMedia {
  mime_type: string
  url: string
  start: dayjs.Dayjs
  duration: Promise<number>
}

const INPUT_DATE_FORMAT = "YYYY-MM-DD";

@customElement('nvr-card')
export class NVRCard extends LitElement {
  // internal reactive states
  @state() private _header: string | typeof nothing;
  @state() private _content_id: string;
  @state() private _folder_format: string
  @state() private _file_name_format: string
  @state() private _start_at: number;
  @state() private _display_format: string
  @state() private _name: string;
  @state() private _videos: Map<string, PlayMedia[]> = new Map();
  @state() private _is_loading: boolean = false;
  @state() private _selected_date: string = dayjs().format(INPUT_DATE_FORMAT);
  @state() private _selected_video: string;
  @state() private _error: string;

  // private property
  private _hass;

  // lifecycle interface
  setConfig(config: Config) {
    this._header = config.header === "" ? nothing : config.header;
    this._content_id = config.content_id + (!config.content_id.endsWith("/") ? '/' : '');
    this._folder_format = config.folder_format;
    this._file_name_format = config.file_name_format;
    this._start_at = config.start_at;
    this._display_format = config.display_format ?? 'HH:mm:ss'

    if (this._hass) {
      this.hass = this._hass;
    }
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
  }

  // declarative part
  static styles = styles;

  connectedCallback(): void {
    super.connectedCallback();
    this.loadDayFolder(this._selected_date);
  }

  protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    new DigitalPTZ(
      this.renderRoot.querySelector(".player"),
      this.renderRoot.querySelector(".ptz-transform"),
      this.renderRoot.querySelector("video"),
      {
        persist: false,
        persist_key: ''
      }
    )
  }

  render() {
    const videos = this._videos.get(this._selected_date) ?? [];

    return html`
      <ha-card header="${this._header}">
        <div class="card-content">
          <div class="player" style=${styleMap({display: this._selected_video ? 'block':'none'})}>
            <div class="ptz-transform">
              <video src="${this._selected_video}${this._start_at ? `#t=${this._start_at}` : '' }" autoplay controls playsinline preload="auto"/>
            </div>
          </div>
          <div class="date-selector">
            <ha-icon @click="${this.prevDate}" icon="mdi:arrow-left"></ha-icon>
            <input type="date" .value="${this._selected_date}" @change="${this.handleDateChange}" />
            <ha-icon @click="${this.nextDate}" icon="mdi:arrow-right"></ha-icon>
            <br>
          </div>

          ${this._is_loading ?
          html`<div style="text-align:center"><ha-circular-progress active="active"></ha-circular-progress></div>`:
          html`
          ${videos.length === 0 ? html`<div style="text-align:center">Keine Aufnahmen gefunden</div>`: ''}
          <div class="videos">
            ${videos.map((video) => html`<div class=${classMap({selected: this._selected_video === video.url})} @click="${() => this._selected_video = video.url}">${video.start.format(this._display_format)}</div>`)}
          </div>`}
        </div>
      </ha-card>
    `;
  }

  get dateAsDayjs(): dayjs.Dayjs {
    return dayjs(this._selected_date, INPUT_DATE_FORMAT);
  }

  prevDate() {
    this.setDate(this.dateAsDayjs.subtract(1, 'day').format(INPUT_DATE_FORMAT));
  }

  nextDate() {
    this.setDate(this.dateAsDayjs.add(1, 'day').format(INPUT_DATE_FORMAT));
  }

  handleDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.setDate(target.value);
  }

  setDate(value: string) {
    if (value === "") {
      this._selected_date = dayjs().format(INPUT_DATE_FORMAT);
    }
    this._selected_date = value;
    this.loadDayFolder(this._selected_date);
  }

  async loadDayFolder(date: string) {
    if (this._videos.has(date)) {
      return;
    }
    const start_folder = this._content_id + dayjs(date, INPUT_DATE_FORMAT).format(this._folder_format);
    this._is_loading = true;
    try {
      const videos = await this.loadFolderRecursive(start_folder);
      this.appendVideos(date, videos);
    } catch (e) {
      if (e.code === "browse_media_failed" && e.message === "Path does not exist.") {
        // empty dir
      } else {
        this._error = e.toString();
      }
    } finally {
      if (date == this._selected_date) {
        this._is_loading = false;
      }
    }
  }

  appendVideos(date: string, videos: PlayMedia[]) {
    videos.sort((a, b) => a.start.isBefore(b.start) ? 1 : -1);
    this._videos.set(date, videos);
  }

  async loadFolderRecursive(content_id: string): Promise<PlayMedia[]> {
    const media = await this.apiBrowseMedia(content_id);

    const folder_promises: Promise<PlayMedia[]>[] = []
    const video_promises: Promise<PlayMedia>[] = [];

    for (const child of media.children) {
      switch (child.media_class) {
        case "directory":
          folder_promises.push(this.loadFolderRecursive(child.media_content_id));
          break;
        case "video":
          video_promises.push(this.enrichResolveMedia(child.title, this.apiResolveMedia(child.media_content_id)));
          break;
      }
    }

    const folders = (await Promise.all(folder_promises)).flat(1)
    const videos = await Promise.all(video_promises);
    return [...folders, ...videos];
  }

  async apiBrowseMedia(content_id: string): Promise<BrowseMedia> {
    return await this._hass.callWS({
      type: "media_source/browse_media",
      media_content_id: content_id
    });
  }

  async enrichResolveMedia(title: string, resolveMedia: Promise<PlayMedia>) {
    const result = await resolveMedia;
    result.start = dayjs(title, this._file_name_format);
    // result.duration = this.loadVideoMetadata(result.url);
    return result;
  }

  loadVideoMetadata(url: string) {
    return new Promise<number>((resolve, reject) => {
      const el = document.createElement("video");
      el.preload = "metadata";
      el.onloadedmetadata = () => {
        resolve(el.duration);
      }
      el.onerror = reject;
      el.src = url;

      setTimeout(reject, 5000);
    });
  }

  async apiResolveMedia(content_id: string): Promise<PlayMedia> {
    return await this._hass.callWS({
      type: "media_source/resolve_media",
      media_content_id: content_id,
      expires: 60 * 60
    });
  }

  static getStubConfig() {
    return {
      content_id: "media-source://media_source/local/camera",
      header: "",
      folder_format: "YYYYMMDD",
      file_name_format: "YYYYMMDD_HHmmss"
    };
  }
}

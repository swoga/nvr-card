export enum MediaClass {
    "album",
    "app",
    "artist",
    "channel",
    "composer",
    "contributing_artist",
    "directory",
    "episode",
    "game",
    "genre",
    "image",
    "movie",
    "music",
    "playlist",
    "podcast",
    "season",
    "track",
    "tv_show",
    "url",
    "video"
}

export enum MediaType {
    "album",
    "app",
    "apps",
    "artist",
    "channel",
    "channels",
    "composer",
    "contributing_artist",
    "episode",
    "game",
    "genre",
    "image",
    "movie",
    "music",
    "playlist",
    "podcast",
    "season",
    "track",
    "tvshow",
    "url",
    "video"
}

export interface BrowseMedia {
    media_class: MediaClass | string
    media_content_id: string
    media_content_type: MediaType | string
    title: string
    can_play: boolean
    can_expand: boolean
    children: BrowseMedia[]
    children_media_class: MediaClass | string
    thumbnail: string
    not_shown: number
}
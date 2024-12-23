/*
 * Copyright 2024 ByOmakase, LLC (https://byomakase.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export interface SourceInfo {
  id: string;
  name: string;
  modified: string;
  format: string;
  size_kb: number;
  bandwidth_kb: number;
  duration_sec: number;
  video_tracks: number;
  audio_tracks: number;
}

export interface Container {
  kind: string;
  faststart: boolean;
  duration_sec: number;
  bitrate_kb: number;
  size_kb: number;
}

export interface Audio {
  pid: number;
  sample_format: string;
  codec: string;
  sample_rate: number;
  channels: number;
  sample_size: number;
  channel_designators: string[];
  duration_sec: number;
  bitrate_mode: string;
  bitrate_kb: number;
  channel_order: string;
}

export interface Video {
  pid: number;
  codec: string;
  profile: string;
  bitrate_mode: string;
  bitrate_kb: number;
  frame_rate: number;
  height: number;
  width: number;
  interlace_mode: string;
  dar: number;
  par: number;
  chroma_format: string;
  color_primaries: string;
  color_matrix: string;
  color_trc: string;
  duration_sec: number;
  precise_frame_rate: number;
  frame_rate_mode: string;
  clean_aperture_height: number;
  clean_aperture_width: number;
  bit_resolution: number;
  color_space: string;
}

export interface Timecode {
  source: string;
  start_value: string;
  format: string;
}

export interface Asset {
  asset_url: string;
  creator: string;
  creation_date: string;
  tagged_date: string;
  content_type: string;
}

export interface GeneralProperties {
  container: Container;
  audio: Audio[];
  video: Video;
  timecode: Timecode[];
  asset: Asset;
}

export interface MediaInfo {
  source_id: string;
  general_properties: GeneralProperties;
}

export interface MasterManifest {
  id: string;
  name: string;
  width?: number;
  height?: number;
  bitrate_kb?: number;
  codec?: string;
  color_range?: string;
  frame_rate?: string;
  url: string;
  drop_frame?: boolean;
  ffom?: string;
}

export interface VisualReference {
  id: string;
  type: VisualReferenceType;
  url: string;
}

export type VisualReferenceType = 'marker' | 'thumbnails' | 'waveform';

export interface Analysis {
  id: string;
  name: string;
  type: AnalysisType;
  visualization: AnalysisVisualization;
  url: string;
  group?: string;
}

export interface ChartAnalysis extends Analysis {
  y_min?: number;
  y_max?: number;
  scale: string;
}

export type AnalysisType = 'event' | 'events' | 'chart';
export type AnalysisVisualization = 'marker' | 'point' | 'bar' | 'led' | 'line';

export interface MediaTrack {
  id: string;
  name: string;
  source_id: string;
}

export interface VideoMediaTrack extends MediaTrack {
  manifest_ids: string[];
  visual_reference: VisualReference[];
  analysis: Analysis[];
}

export interface AudioMediaTrack extends MediaTrack {
  program_name: string;
  sound_field: string;
  channel_layout?: string;
  language?: string;
  channels?: Channel[];
  analysis?: Analysis[];
  visual_reference?: VisualReference[]; // can appear in media files without channels (ie. audio only files)
}

export type TextMediaTrackUsageType = 'subtitles' | 'fn_subtitles' | 'captions';

export interface TextMediaTrack extends MediaTrack {
  program_name: string;
  usage_type?: TextMediaTrackUsageType;
  analysis?: Analysis[];
  language?: string;
}

export interface Channel {
  id: string;
  channel_order?: string;
  program_name: string;
  visual_reference: VisualReference[];
}

export interface MediaTracks {
  video?: VideoMediaTrack[];
  audio?: AudioMediaTrack[];
  text?: TextMediaTrack[];
}

export type InfoTabType = 'json' | 'file_list';

export type InfoTabVisualization = 'json_tree' | 'list';

export interface InfoTab {
  name: string;
  type: InfoTabType;
  visualization: InfoTabVisualization;
  data: any; // TODO
  files: any[];
}

export interface InfoTabFile {
  filename: string;
  description?: string;
  url?: string;
}

export interface Layout {
  qc?: boolean;
  segmentation?: boolean;
  approval?: boolean;
  annotations?: boolean;
  annotation_threading?: boolean;
}

export interface SegmentationAction {
  name: string;
  data?: any;
}

export interface Presentation {
  layout: Layout;
  info_tabs: InfoTab[];
  timeline_configuration: {
    track_ordering?: string[];
    visible_tracks?: string[];
    visible_analysis_groups?: string[];
  };
  segmentation_actions: SegmentationAction[];
}

export interface BasicAuthenticationData {
  type: 'basic';
  username: string;
  password: string;
}

export interface BearerAuthenticationData {
  type: 'bearer';
  token: string;
}

export type AuthenticationType = 'none' | 'basic' | 'bearer';

export interface AuthenticationData {
  type: AuthenticationType;
  username?: string;
  password?: string;
  token?: string;
}

export interface BasicAuthenticationData {
  type: 'basic';
  username: string;
  password: string;
}

export interface BearerAuthenticationData {
  type: 'bearer';
  token: string;
}

export interface SessionData {
  version: string;
  session?: {
    id?: string;
    next?: string;
    previous?: string;
    status?: string;
    services?: {
      media_authentication?: AuthenticationData;
    };
  };
  data: {
    source_info: SourceInfo[];
    media_info: MediaInfo[];
    master_manifests: MasterManifest[];
    media_tracks: MediaTracks;
  };
  presentation?: Presentation;
}

export type TimelineLaneWithOptionalGroup<T> = T & {group?: string};

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

import {AudioMediaTrack, Channel, MasterManifest, TextMediaTrack, VideoMediaTrack} from '../model/domain.model';

export class DomainUtil {

  static resolveFrameRate(masterManifest: MasterManifest, videoMediaTracks: VideoMediaTrack[] | undefined): number | string {
    if (masterManifest.frame_rate) {
      return masterManifest.frame_rate;
    } else if (DomainUtil.isAudioOnly(videoMediaTracks)) {
      return 100;
    } else {
      throw new Error('Frame rate cannot be resolved or audio only media is not valid');
    }
  }

  static isAudioOnly(videoMediaTracks: VideoMediaTrack[] | undefined): boolean {
    // assuming we have audio-only manifest
    return !videoMediaTracks || videoMediaTracks.length === 0;
  }

  static resolveSoundFieldLabel(audioMediaTrack: AudioMediaTrack): string | undefined {
    if (audioMediaTrack.sound_field) {
      let text = audioMediaTrack.sound_field;
      switch (audioMediaTrack.sound_field!) {
        case 'mono':
          text = '1.0';
          break;
        case 'stereo':
          text = '2.0'
          break;
        default:
          break;
      }
      return text;
    } else {
      return void 0;
    }
  }

  static resolveTextTrackUsageLabel(textMediaTrack: TextMediaTrack): string | undefined {
    if (textMediaTrack.usage_type) {
      switch (textMediaTrack.usage_type!) {
        case 'subtitles':
          return 'SUB';
        case 'fn_subtitles':
          return 'FN'
        case 'captions':
          return 'CC'
        default:
          return void 0;
      }
    } else {
      return void 0;
    }
  }

  static resolveAudioMediaTrackChannelsInOrder(audioMediaTrack: AudioMediaTrack): Channel[] | undefined {
    let channelsInOrder: Channel[] | undefined = void 0;
    if (audioMediaTrack.channels) {
      let channelLayoutOrders = audioMediaTrack.channel_layout ? audioMediaTrack.channel_layout.split(' ') : void 0;
      if (channelLayoutOrders && channelLayoutOrders.length > 0 && audioMediaTrack.channels && (channelLayoutOrders.length === audioMediaTrack.channels.length)) {
        for (const channelLayoutOrder of channelLayoutOrders) {
          if (audioMediaTrack.channels!.findIndex(p => p.channel_order === channelLayoutOrder) < 0) {
            channelLayoutOrders = void 0;
            break;
          }
        }
      } else {
        channelLayoutOrders = void 0;
      }

      if (channelLayoutOrders) {
        channelsInOrder = channelLayoutOrders.map(channelLayoutOrder => audioMediaTrack.channels!.find(p => p.channel_order === channelLayoutOrder)!)
      } else {
        channelsInOrder = audioMediaTrack.channels;
      }
    }

    return channelsInOrder;
  }

}

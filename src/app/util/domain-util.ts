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

import {AudioMediaTrack, ChannelType, MainMedia, TextMediaTrack, VideoMediaTrack, VisualReference} from '../model/domain.model';
import {OmpAudioRoutingConnection} from '@byomakase/omakase-player';

export class DomainUtil {
  static resolveFrameRate(mainMedia: MainMedia, videoMediaTracks: VideoMediaTrack[] | undefined): number | string | undefined {
    if (mainMedia.frame_rate) {
      return mainMedia.frame_rate;
    } else if (DomainUtil.isAudioOnly(videoMediaTracks)) {
      return 100;
    } else if (mainMedia.type === 'hls') {
      return undefined;
    } else {
      throw new Error('Frame rate cannot be resolved or audio only media is not valid');
    }
  }

  static isAudioOnly(videoMediaTracks: VideoMediaTrack[] | undefined): boolean {
    // assuming we have audio-only manifest
    return !videoMediaTracks || videoMediaTracks.length === 0;
  }

  /**
   * Resolves number of channels from sound_field label
   * @param audioMediaTrack
   * @returns number of channels or 2 if sound_field is missing or the value is not supported
   */
  static resolveChannelNrFromChannelLayout(audioMediaTrack: AudioMediaTrack): number {
    if (audioMediaTrack.channel_layout) {
      return audioMediaTrack.channel_layout.split(' ').length;
    } else {
      return 2;
    }
  }

  static resolveAudioMediaTrackVisualReferencesInOrder(audioMediaTrack: AudioMediaTrack): VisualReference[] | undefined {
    let visualReferencesInOrder: VisualReference[] | undefined = void 0;
    if (audioMediaTrack.visual_reference) {
      let channelLayoutOrders = audioMediaTrack.channel_layout ? audioMediaTrack.channel_layout.split(' ') : void 0;
      if (channelLayoutOrders && channelLayoutOrders.length > 0 && audioMediaTrack.visual_reference && channelLayoutOrders.length === audioMediaTrack.visual_reference.length) {
        for (const channelLayoutOrder of channelLayoutOrders) {
          if (audioMediaTrack.visual_reference!.findIndex((p) => p.channel === channelLayoutOrder) < 0) {
            channelLayoutOrders = void 0;
            break;
          }
        }
      } else {
        channelLayoutOrders = void 0;
      }

      if (channelLayoutOrders) {
        visualReferencesInOrder = channelLayoutOrders.map((channelLayoutOrder) => audioMediaTrack.visual_reference!.find((p) => p.channel === channelLayoutOrder)!);
      } else {
        visualReferencesInOrder = audioMediaTrack.visual_reference;
      }
    }

    return visualReferencesInOrder;
  }
}

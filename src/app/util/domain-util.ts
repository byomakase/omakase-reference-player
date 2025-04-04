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

import {AudioInputOutputNode} from '@byomakase/omakase-player/dist/video/model';
import {AudioMediaTrack, ChannelType, MasterManifest, TextMediaTrack, VideoMediaTrack, VisualReference} from '../model/domain.model';

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
        case '2.0':
          text = '2.0';
          break;
        case '1.0':
          text = '1.0';
          break;
        case 'stereo':
          text = '2.0';
          break;
        case '5.1':
          text = '5.1';
          break;
        case '7.1':
          text = '7.1';
          break;
        default:
          break;
      }
      return text;
    } else {
      return void 0;
    }
  }

  /**
   * Resolves number of channels from sound_field label
   * @param audioMediaTrack
   * @returns number of channels or 2 if sound_field is missing or the value is not supported
   */
  static resolveChannelNrFromSoundFieldLabel(audioMediaTrack: AudioMediaTrack): number {
    if (audioMediaTrack.sound_field) {
      let channels;
      switch (audioMediaTrack.sound_field!) {
        case 'mono':
          channels = 1;
          break;
        case '2.0':
          channels = 2;
          break;
        case '1.0':
          channels = 1;
          break;
        case 'stereo':
          channels = 2;
          break;
        case '5.1':
          channels = 6;
          break;
        case '7.1':
          channels = 8;
          break;
        default:
          channels = 2;
          break;
      }
      return channels;
    } else {
      return 2;
    }
  }

  static resolveTextTrackUsageLabel(textMediaTrack: TextMediaTrack): string | undefined {
    if (textMediaTrack.usage_type) {
      switch (textMediaTrack.usage_type!) {
        case 'subtitles':
          return 'SUB';
        case 'fn_subtitles':
          return 'FN';
        case 'captions':
          return 'CC';
        default:
          return void 0;
      }
    } else {
      return void 0;
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

  static resolveAudioChannelLaneVisualization(channel: ChannelType | undefined, inputNumber: number, outputNumber: number | undefined): AudioInputOutputNode[] {
    if (inputNumber === outputNumber) {
      return [{inputNumber: inputNumber, outputNumber: outputNumber, connected: true}];
    }
    if (channel) {
      if (channel === 'C' || channel === 'LFE') {
        return [
          {inputNumber: inputNumber, outputNumber: 0, connected: true},
          {inputNumber: inputNumber, outputNumber: 1, connected: true},
        ];
      } else if (channel === 'L' || channel === 'LS') {
        return [{inputNumber: inputNumber, outputNumber: 0, connected: true}];
      }

      return [{inputNumber: inputNumber, outputNumber: 1, connected: true}];
    } else {
      if (inputNumber === 2 || inputNumber === 3) {
        return [
          {inputNumber: inputNumber, outputNumber: 0, connected: true},
          {inputNumber: inputNumber, outputNumber: 1, connected: true},
        ];
      } else if (inputNumber === 0 || inputNumber === 4) {
        return [{inputNumber: inputNumber, outputNumber: 0, connected: true}];
      }

      return [{inputNumber: inputNumber, outputNumber: 1, connected: true}];
    }
  }

  static createDefaultMatrix(inputsNumber: number, outputsNumber: number): AudioInputOutputNode[] {
    const emptyMatrix = this.createEmptyMatrix(inputsNumber, outputsNumber);

    if ((inputsNumber === 2 && outputsNumber === 2) || (inputsNumber === 2 && outputsNumber === 6) || (inputsNumber === 6 && outputsNumber === 6)) {
      return emptyMatrix.map((p) => {
        if (p.inputNumber === p.outputNumber) {
          return {
            ...p,
            connected: true,
          };
        }

        return p;
      });
    } else if (inputsNumber === 6 && outputsNumber === 2) {
      return emptyMatrix.map((p) => {
        if (p.inputNumber === p.outputNumber || p.inputNumber === 2 || p.inputNumber - 4 === p.outputNumber) {
          return {
            ...p,
            connected: true,
          };
        }

        return p;
      });
    } else if (inputsNumber === 1 && outputsNumber <= 6) {
      return emptyMatrix.map((p) => {
        return {
          ...p,
          connected: true,
        };
      });
    }

    return [];
  }

  static createEmptyMatrix(inputsNumber: number, outputsNumber: number): AudioInputOutputNode[] {
    return [...Array(inputsNumber).keys()].flatMap((r) =>
      [...Array(outputsNumber).keys()].map((c) => {
        return {
          inputNumber: r,
          outputNumber: c,
          connected: false,
        };
      })
    );
  }
}

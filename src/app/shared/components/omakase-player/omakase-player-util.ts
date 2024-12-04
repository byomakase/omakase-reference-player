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

import {HelpMenuGroup, HelpMenuItem, OmakasePlayerApi} from '@byomakase/omakase-player';
import {ArrayUtil} from '../../../util/array-util';
import {UserAgent} from '../../../core/browser/window.service';

const playerPlaybackRateList = [0.25, 0.5, 0.75, 1, 2, 4, 8];

export class OmakasePlayerUtil {
  public static getKeyboardShortcutsHelpMenuGroup(platform: 'unknown' | 'macos' | 'windows' | 'linux'): HelpMenuGroup {
    let keyCombination = (...keys: string[]) => {
      return keys.join(' + ');
    };

    let multipleCombinations = (...keys: string[]) => {
      return keys.join(', ');
    };

    let shiftKey = 'shift'.toUpperCase();
    let ctrlKey = 'ctrl'.toUpperCase();
    let altKey = platform === 'macos' ? 'option' : 'alt';
    let metaKey = platform === 'windows' ? 'win' : platform === 'linux' ? 'super' : 'cmd';

    let playbackRate: HelpMenuItem[] = ArrayUtil.range(2, 8).map((p, index) => {
      return {
        description: `Playback Speed rate ${playerPlaybackRateList[index]}x`,
        name: keyCombination(ctrlKey, shiftKey, `${p}`),
      };
    });

    let helpMenuItems: HelpMenuItem[] = [
      {
        description: 'Play / Pause',
        name: keyCombination('Space'),
      },
      {
        description: 'Toggle Mute',
        name: keyCombination('m'),
      },
      {
        description: 'Toggle Text On / Off',
        name: keyCombination('s'),
      },

      {
        description: 'Collapse / Expand All Timeline Rows',
        name: keyCombination(ctrlKey, shiftKey, 's'),
      },
      {
        description: 'Toggle Next Audio Track',
        name: keyCombination(shiftKey, 'a'),
      },
      {
        description: 'Toggle Previous Audio Track',
        name: keyCombination('a'),
      },
      {
        description: 'Toggle Next Text Track',
        name: keyCombination(shiftKey, 't'),
      },
      {
        description: 'Toggle Previous Text Track',
        name: keyCombination('t'),
      },
      {
        description: 'Toggle Next Channel of Active Audio Track',
        name: keyCombination(shiftKey, 'c'),
      },
      {
        description: 'Toggle Previous Channel of Active Audio Track',
        name: keyCombination('c'),
      },
      {
        description: 'One Frame Forward',
        name: keyCombination('Arrow Right'),
      },

      {
        description: 'One Frame Backward',
        name: keyCombination('Arrow Left'),
      },

      {
        description: '10 Frames Forward',
        name: keyCombination(ctrlKey, shiftKey, 'Arrow Right'),
      },

      {
        description: '10 Frames Backwards',
        name: keyCombination(ctrlKey, shiftKey, 'Arrow Left'),
      },

      {
        description: 'One Second Forward',
        name: keyCombination(shiftKey, 'Arrow Up'),
      },

      {
        description: 'One Second Backward',
        name: keyCombination(shiftKey, 'Arrow Down'),
      },

      {
        description: 'Ten Seconds Forward',
        name: keyCombination(ctrlKey, shiftKey, 'Arrow Up'),
      },

      {
        description: 'Ten Seconds Backward',
        name: keyCombination(ctrlKey, shiftKey, 'Arrow Down'),
      },

      {
        description: 'Video in Full Screen',
        name: keyCombination('f'),
      },
      ...playbackRate,
      {
        description: 'Timeline Zoom level 100%',
        name: keyCombination(ctrlKey, '0'),
      },

      {
        description: 'Timeline Zoom In',
        name: keyCombination('='),
      },

      {
        description: 'Timeline Zoom Out',
        name: keyCombination('_'),
      },

      {
        description: 'Increase Volume',
        name: keyCombination(shiftKey, 'v'),
      },
      {
        description: 'Increase Volume',
        name: keyCombination(shiftKey, 'v'),
      },
      {
        description: 'Reduce Volume',
        name: keyCombination('v'),
      },
      // {
      //   description: 'Launch Configuration Panel',
      //   name: keyCombination(ctrlKey, shiftKey, 'c')
      // },
    ];

    return {
      name: $localize`Keyboard shortcuts`,
      items: [...helpMenuItems],
    };
  }

  /**
   * Returns true if keyboard mapping was handled successfully or false if mapping was not handled
   *
   * @param event
   * @param omakasePlayer
   */
  public static handleKeyboardEvent(event: KeyboardEvent, omakasePlayer: OmakasePlayerApi, userAgent?: UserAgent): boolean {
    let config = {
      zoomStep: 200,
      volumeStep: 0.1,
    };

    const targetElement = event.target as HTMLElement;
    const formInputs = ['INPUT', 'TEXTAREA'];
    if (formInputs.includes(targetElement.tagName.toUpperCase())) {
      return false;
    }

    if (omakasePlayer && omakasePlayer.video) {
      //  Play / Pause
      if (event.code === 'Space' && (userAgent !== 'safari' || !omakasePlayer.video.isFullscreen())) {
        // enabled only in non-fullscreen mode for safari
        omakasePlayer.video.togglePlayPause();
        return true;
      }

      // Toggle Mute
      if (event.code === 'KeyM') {
        omakasePlayer.video.toggleMuteUnmute();
        return true;
      }

      // Toggle Text On / Off
      if (event.code === 'KeyS' && !(event.ctrlKey && event.shiftKey)) {
        omakasePlayer.subtitles.toggleShowHideActiveTrack();
        return true;
      }

      if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        let upOrDown = event.key === 'ArrowRight' ? 1 : -1;
        let amount = event.ctrlKey && event.shiftKey ? 10 : 1;

        if (omakasePlayer.video.isPlaying()) {
          omakasePlayer.video.pause();
        }

        omakasePlayer.video.seekFromCurrentFrame(amount * upOrDown).subscribe();

        return true;
      }

      if (['ArrowUp', 'ArrowDown'].includes(event.key) && ((event.shiftKey && event.ctrlKey) || (event.shiftKey && !event.ctrlKey))) {
        let upOrDown = event.key === 'ArrowUp' ? 1 : -1;

        let amount: number | undefined;
        if (event.shiftKey && event.ctrlKey) {
          amount = 10;
        } else if (event.shiftKey && !event.ctrlKey) {
          amount = 1;
        }

        if (amount) {
          if (omakasePlayer.video.isPlaying()) {
            omakasePlayer.video.pause();
          }

          omakasePlayer.video.seekFromCurrentTime(amount * upOrDown).subscribe();

          return true;
        } else {
          return false;
        }
      }

      // Fullscreen
      if (event.code === 'KeyF') {
        omakasePlayer.video.toggleFullscreen();
        return true;
      }

      // Playback speed
      if (event.shiftKey && event.ctrlKey) {
        let mapping = ArrayUtil.range(2, 8).reduce((map, p, index) => {
          map.set(`Digit${p}`, playerPlaybackRateList[index]);
          return map;
        }, new Map<string, number>());

        if (mapping.has(event.code)) {
          omakasePlayer.video.setPlaybackRate(mapping.get(event.code)!);
          return true;
        }
      }

      // Zoom 100%
      if (event.code === 'Digit0' && event.ctrlKey) {
        omakasePlayer.timeline!.zoomToEased(100).subscribe();
        return true;
      }

      // Zoom in
      if (event.key === '=') {
        omakasePlayer.timeline!.zoomInEased().subscribe();
        return true;
      }

      // Zoom Out
      if (event.key === '-') {
        omakasePlayer.timeline!.zoomOutEased().subscribe();
        return true;
      }

      // Volume
      if (event.code === 'KeyV') {
        let step = 0.1;
        let upOrDown = event.shiftKey ? 1 : -1;
        omakasePlayer.video.setVolume(omakasePlayer.video.getVolume() + step * upOrDown);
        return true;
      }
    }

    return false;
  }

  public static getPlayerPlaybackRateList() {
    return playerPlaybackRateList;
  }
}

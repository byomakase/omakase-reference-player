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
import {UserAgent} from '../../../core/browser/window.service';

const playerPlaybackRateList = [0.25, 0.5, 0.75, 1, 2, 4, 8];

export class OmakasePlayerUtil {
  public static getKeyboardShortcutsHelpMenuGroup(platform: 'unknown' | 'macos' | 'windows' | 'linux'): HelpMenuGroup[] {
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

    let playbackHelpMenuItems: HelpMenuItem[] = [
      {
        description: 'Play / Pause',
        name: keyCombination('Space'),
      },

      {
        description: 'Toggle Sound',
        name: keyCombination('s'),
      },

      {
        description: 'Toggle Text On / Off',
        name: keyCombination('d'),
      },

      {
        description: 'Toggle Full Screen',
        name: keyCombination('f'),
      },

      {
        description: 'Increase Volume',
        name: keyCombination(shiftKey, '\\'),
      },

      {
        description: 'Reduce Volume',
        name: keyCombination('\\'),
      },

      {
        description: 'One Frame Forward',
        name: keyCombination('Right Arrow'),
      },

      {
        description: 'One Frame Backward',
        name: keyCombination('Left Arrow'),
      },

      {
        description: '10 Frames Forward',
        name: keyCombination(shiftKey, 'Right Arrow'),
      },

      {
        description: '10 Frames Backwards',
        name: keyCombination(shiftKey, 'Left Arrow'),
      },

      {
        description: 'Stop shuttle and pause',
        name: keyCombination('k'),
      },

      {
        description: 'Decrease Shuttle Forwards',
        name: keyCombination('l'),
      },

      {
        description: 'Increase Shuttle Forwards',
        name: keyCombination(shiftKey, 'l'),
      },

      {
        description: 'Set playhead to Start of Media and Stop',
        name: keyCombination('1 / Home'),
      },

      {
        description: 'Set playhead to End of Media and Stop',
        name: keyCombination(ctrlKey, '1') + ' / End',
      },
    ];

    let timelineHelpMenuItems: HelpMenuItem[] = [
      {
        description: 'Timeline Zoom In',
        name: keyCombination('='),
      },

      {
        description: 'Timeline Zoom Out',
        name: keyCombination('-'),
      },

      {
        description: 'Timeline Zoom level 100%',
        name: keyCombination('0'),
      },

      {
        description: 'Collapse / Expand All Timeline Rows',
        name: keyCombination('a'),
      },

      {
        description: 'Show / Hide Cofiguration Panel',
        name: keyCombination('g'),
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
        description: 'Toggle Next Audio Track',
        name: keyCombination(shiftKey, 'e'),
      },

      {
        description: 'Toggle Previous Audio Track',
        name: keyCombination('e'),
      },

      {
        description: 'Toggle Next Channel of Active Audio Track',
        name: keyCombination(shiftKey, 'r'),
      },

      {
        description: 'Toggle Previous Channel of Active Audio Track',
        name: keyCombination('r'),
      },
    ];

    let segmentationAndMarkersHelpMenuItems: HelpMenuItem[] = [
      {
        description: 'Mark In / Out',
        name: keyCombination('m'),
      },

      {
        description: 'Add point',
        name: keyCombination(','),
      },

      {
        description: 'Split Active Marker',
        name: keyCombination('.'),
      },

      {
        description: 'Delete Active Marker',
        name: keyCombination('n'),
      },

      {
        description: 'Toggle Previous Marker',
        name: keyCombination('/'),
      },

      {
        description: 'Toggle Next Marker',
        name: keyCombination(shiftKey, '/'),
      },

      {
        description: 'Set Start of Active Marker to Playhead Position',
        name: keyCombination('i'),
      },

      {
        description: 'Set End of Active Marker to Playhead Position',
        name: keyCombination('o'),
      },

      {
        description: 'Set Playhead to Start of Active Marker',
        name: keyCombination('['),
      },

      {
        description: 'Set Playhead to End of Active Marker',
        name: keyCombination(']'),
      },

      {
        description: 'Rewind 3 Seconds and Play to Current Playhead',
        name: keyCombination(metaKey, 'Arrow Left'),
      },

      {
        description: 'Play 3 Seconds and Rewind to Current Playhead',
        name: keyCombination(metaKey, 'Arrow Right'),
      },

      {
        description: 'Loop on Active Marker',
        name: keyCombination('p'),
      },
    ];

    let sessionNavigationHelpMenuItems: HelpMenuItem[] = [
      {
        description: 'Navigate to Previous Session',
        name: keyCombination(altKey, 'Arrow Left'),
      },

      {
        description: 'Navigate to Next Session',
        name: keyCombination(altKey, 'Arrow Right'),
      },
    ];

    return [
      {
        name: $localize`Playback Functions Shortcuts`,
        items: [...playbackHelpMenuItems],
      },

      {
        name: $localize`Timeline Manipulation Shortcuts`,
        items: [...timelineHelpMenuItems],
      },

      {
        name: $localize`Segmentation and Markers Shortcuts`,
        items: [...segmentationAndMarkersHelpMenuItems],
      },

      {
        name: $localize`Session Navigation Shortcus`,
        items: [...sessionNavigationHelpMenuItems],
      },
    ];
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
    const formInputs = ['INPUT', 'TEXTAREA', 'OMAKASE-MARKER-LIST'];
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

      // Toggle Sound
      if (event.code === 'KeyS' && !event.shiftKey && !event.ctrlKey) {
        omakasePlayer.video.toggleMuteUnmute();
        return true;
      }

      // Toggle Text On / Off
      if (event.code === 'KeyD' && !(event.ctrlKey && event.shiftKey)) {
        omakasePlayer.subtitles.toggleShowHideActiveTrack();
        return true;
      }

      // Reset shuttle
      if (event.code === 'KeyK') {
        omakasePlayer.video.setPlaybackRate(1);
        omakasePlayer.video.pause();
      }

      // Change shuttle
      if (event.code === 'KeyL') {
        let increaseOrDecrease = event.shiftKey ? 1 : -1;
        const playbackRateIndex = playerPlaybackRateList.indexOf(omakasePlayer.video.getPlaybackRate()) + increaseOrDecrease;
        let playbackRate;

        if (playbackRateIndex < 0) {
          playbackRate = playerPlaybackRateList.at(0);
        } else if (playbackRateIndex >= playerPlaybackRateList.length) {
          playbackRate = playerPlaybackRateList.at(-1);
        } else {
          playbackRate = playerPlaybackRateList.at(playbackRateIndex);
        }

        omakasePlayer.video.setPlaybackRate(playbackRate!);
        omakasePlayer.video.isPaused() && omakasePlayer.video.play();

        return true;
      }

      if (omakasePlayer.video.isVideoLoaded()) {
        // N Frames Forward / Backward
        if (['ArrowLeft', 'ArrowRight'].includes(event.key) && !event.metaKey && !event.altKey) {
          let upOrDown = event.key === 'ArrowRight' ? 1 : -1;
          let amount = event.shiftKey ? 10 : 1;

          if (omakasePlayer.video.isPlaying()) {
            omakasePlayer.video.pause();
          }

          omakasePlayer.video.seekFromCurrentFrame(amount * upOrDown).subscribe();

          return true;
        }

        // Playhead Position to Start
        if ((event.code === 'Digit1' && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) || event.code === 'Home') {
          omakasePlayer.video.pause().subscribe(() => omakasePlayer.video.seekToFrame(0));

          return true;
        }

        // Playhead Position to End
        if ((event.code === 'Digit1' && event.ctrlKey) || event.code === 'End') {
          omakasePlayer.video.pause().subscribe(() => omakasePlayer.video.seekToFrame(omakasePlayer.video.getTotalFrames()));

          return true;
        }
      }

      // Fullscreen
      if (event.code === 'KeyF') {
        omakasePlayer.video.toggleFullscreen();
        return true;
      }

      // Zoom 100%
      if (event.code === 'Digit0') {
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
    }

    return false;
  }

  public static getPlayerPlaybackRateList() {
    return playerPlaybackRateList;
  }
}

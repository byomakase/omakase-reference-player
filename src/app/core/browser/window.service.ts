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

/* tslint:disable:variable-name */
import {Inject, Injectable} from '@angular/core';
import {WindowToken} from './window.provider';

export type UserAgent = 'unknown' | 'android' | 'firefox' | 'edge' | 'chrome' | 'chromium' | 'safari';
export type UserAgentPlatform = 'unknown' | 'macos' | 'windows' | 'linux';

@Injectable({
  providedIn: 'root',
})
export class WindowService {
  constructor(@Inject(WindowToken) private _window: Window) {}

  get window() {
    return this._window;
  }

  get navigator() {
    return this._window.navigator;
  }

  get userAgent(): UserAgent {
    let userAgentText = (this.navigator && this.navigator.userAgent) || '';
    if (/Android/i.test(userAgentText)) {
      return 'android';
    } else if (/Firefox/i.test(userAgentText)) {
      return 'firefox';
    } else if (/Edg/i.test(userAgentText)) {
      return 'edge';
    } else if ((/Chrome/i.test(userAgentText) || /CriOS/i.test(userAgentText)) && !/Edg/i.test(userAgentText)) {
      return 'chrome';
    } else if (/Chrome/i.test(userAgentText) || /CriOS/i.test(userAgentText)) {
      return 'chromium';
    } else if (/Safari/i.test(userAgentText)) {
      return 'safari';
    } else {
      return 'unknown';
    }
  }

  get platform(): UserAgentPlatform {
    // @ts-ignore
    let platformText: string = this.navigator?.['userAgentData']?.platform || this.navigator?.platform;
    if (platformText?.toUpperCase().includes('MAC')) {
      return 'macos';
    } else if (platformText?.toUpperCase().includes('WIN')) {
      return 'windows';
    } else if (platformText?.toUpperCase().includes('LINUX')) {
      return 'linux';
    } else {
      return 'unknown';
    }
  }

  isUserAgent(agent: UserAgent): boolean {
    return this.userAgent === agent;
  }

  isPlatform(platform: UserAgentPlatform): boolean {
    return platform === this.platform;
  }

  open(url: string, target: '_blank' | '_self' = '_blank') {
    this.window.open(url, target);
  }
}

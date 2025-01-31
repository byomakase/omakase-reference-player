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

import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {LocalStorageService} from '../../shared/storage/local-storage.service';
import {ThemeStyleConstantsType} from '../../shared/constants/theming';
import {DarkThemeStyleConstants} from '../../shared/constants/dark-theming';
import {LightThemeStyleConstants} from '../../shared/constants/light-theming';

export type LayoutTab = 'info' | 'audio' | 'annotation' | 'segmentation';

export type PresentationMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  showTabs$ = new BehaviorSubject<boolean>(false);
  disableSwitchModeButton$ = new BehaviorSubject<boolean>(true);
  presentationMode$: BehaviorSubject<PresentationMode>;

  private _title: string | undefined;
  private _activeTab: LayoutTab = 'info';

  static themeStyleConstants: ThemeStyleConstantsType;

  constructor() {
    const presentationMode = LocalStorageService.getItem('presentationMode') as PresentationMode | undefined;
    this.presentationMode$ = new BehaviorSubject<PresentationMode>(!presentationMode ? 'dark' : presentationMode);

    this.presentationMode$.subscribe({
      next: (presentationMode) => {
        document.documentElement.setAttribute('data-bs-theme', presentationMode);
        document.body.setAttribute('class', `theme-${presentationMode}`);
        LayoutService.themeStyleConstants = presentationMode === 'dark' ? DarkThemeStyleConstants : LightThemeStyleConstants;
      },
    });
  }

  set presentationMode(presentationMode: PresentationMode) {
    LocalStorageService.setItem('presentationMode', presentationMode);
    this.presentationMode$.next(presentationMode);
  }

  togglePresentationMode() {
    this.presentationMode = this.presentationMode$.value === 'dark' ? 'light' : 'dark';
  }

  get title(): string | undefined {
    return this._title;
  }

  set title(value: string | undefined) {
    this._title = value;
  }

  set activeTab(value: LayoutTab) {
    this._activeTab = value;
  }

  get activeTab(): string {
    return this._activeTab;
  }

  clearTitle() {
    this.title = void 0;
  }
}

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

import {Component, OnDestroy, OnInit} from '@angular/core';
import {Subject, takeUntil} from 'rxjs';
import {ActivatedRoute, Router} from '@angular/router';
import {StringUtil} from '../../util/string-util';
import {LayoutService} from './layout.service';
import {IconName} from '../../shared/components/icon/icon.service';
import {TimelineService} from '../../features/timeline/timeline.service';
@Component({
  selector: 'app-layout',
  template: `
    <header>
      <nav class="navbar border-body">
        <div class="container-fluid h-100">
          <a class="navbar-brand p-0 m-0" href="#" (click)="buttonLogoClick($event)">
            <img [src]="ompLogo" />
          </a>
          <ng-content select="[header]"></ng-content>
          <div id="settings" ngbDropdown role="group">
            <button type="button" class="btn btn-settings" ngbDropdownToggle>
              <i appIcon="hamburger-menu"></i>
            </button>
            <div id="settings-menu" [class]="layoutService.presentationMode" ngbDropdownMenu>
              <div class="menu-item d-flex justify-content-between align-items-center">
                <button type="button" class="btn btn-switch" (click)="switchPresentationMode()" [disabled]="layoutService.disableSwitchModeButton$ | async">
                  <i [appIcon]="iconMode" class="icon-colored"></i>
                </button>
                <a>{{ modeLabel }}</a>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>

    <ng-content select="[body]"></ng-content>

    @if (debugMode) {
      <app-debug-stats></app-debug-stats>
    }
  `,
})
export class LayoutComponent implements OnInit, OnDestroy {
  debugMode = false;

  private _destroyed$ = new Subject<void>();

  constructor(
    protected route: ActivatedRoute,
    public layoutService: LayoutService,
    protected timelineService: TimelineService,
    protected router: Router
  ) {
    this.route.queryParams.pipe(takeUntil(this._destroyed$)).subscribe((queryParams) => {
      this.debugMode = StringUtil.isNonEmpty(queryParams['debug'] || queryParams['DEBUG']);
    });
  }

  ngOnInit(): void {}

  ngOnDestroy() {
    this._destroyed$.next();
    this._destroyed$.complete();
  }

  buttonLogoClick(event: Event) {
    event.preventDefault();
  }

  switchPresentationMode() {
    this.layoutService.togglePresentationMode();
  }

  get iconMode(): IconName {
    return `${this.layoutService.presentationMode$.value}-mode` as IconName;
  }

  get modeLabel(): string {
    return `${this.layoutService.presentationMode$.value === 'dark' ? 'DARK' : 'LIGHT'} MODE`;
  }

  get ompLogo(): string {
    return `assets/images/${this.layoutService.presentationMode$.value === 'dark' ? 'omp.svg' : 'omp-light.svg'}`;
  }
}

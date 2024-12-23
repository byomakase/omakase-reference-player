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
import {ActivatedRoute} from '@angular/router';
import {StringUtil} from '../../util/string-util';
import {LayoutService, LayoutTab} from './layout.service';

@Component({
  selector: 'app-layout',
  template: `
    <header>
      <nav class="navbar bg-dark border-body">
        <div class="container-fluid h-100">
          <a class="navbar-brand p-0 m-0" href="#" (click)="buttonLogoClick($event)">
            <img [src]="'assets/images/omp.svg'" />
          </a>
          <div id="header-nav" class="h-100 d-flex" [class.d-none]="!(layoutService.showTabs$ | async)">
            <ul ngbNav class="nav-tabs" [activeId]="layoutService.activeTab" (activeIdChange)="onNavChange($event)">
              <li [ngbNavItem]="'qc'">
                <button ngbNavLink>QC</button>
              </li>
              <li [ngbNavItem]="'segmentation'">
                <button ngbNavLink>SEGMENTATION</button>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>

    <ng-content></ng-content>

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
    public layoutService: LayoutService
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

  onNavChange(activeId: LayoutTab) {
    this.layoutService.activeTab = activeId;
  }
}

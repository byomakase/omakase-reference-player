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

import {Component, EventEmitter, HostBinding, Input, Output} from '@angular/core';
import {NgbDropdown, NgbDropdownButtonItem, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle} from '@ng-bootstrap/ng-bootstrap';
import {BaseGroupingLane, GroupingLaneVisibility} from '../omakase-player/omakase-player-timeline/grouping/base-grouping-lane';
import {forkJoin, take} from 'rxjs';

@Component({
  selector: 'div[appTimelineControls]',
  standalone: true,
  imports: [
    NgbDropdown,
    NgbDropdownButtonItem,
    NgbDropdownItem,
    NgbDropdownMenu,
    NgbDropdownToggle
  ],
  template: `
    <div>
      <div class="btn-group" role="group">
        <button type="button" class="btn" [class.btn-minimize]="visibilityToToggle === 'minimized'" [class.btn-maximize]="visibilityToToggle === 'maximized'" [disabled]="isDisabled" (click)="buttonClickToggleCollapse()"></button>
      </div>
    </div>
  `
})
export class TimelineControlsComponent {
  @Input()
  groupingLanes: BaseGroupingLane<any>[] | undefined;

  @Output()
  readonly groupingLanesVisibilityTrigger: EventEmitter<GroupingLaneVisibility> = new EventEmitter<GroupingLaneVisibility>();

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return 'timeline-controls';
  }

  @HostBinding('class')
  get hostElementClass(): string | undefined {
    return 'd-flex justify-content-between';
  }

  buttonClickToggleCollapse() {
    if (this.groupingLanes) {
      let visibilityToToggle = this.visibilityToToggle;
      let maxLaneIndexForEasing = 0; // only first one
      // ease max numForEasing lanes
      let osEased$ = this.groupingLanes
        .filter((p, index) => index <= maxLaneIndexForEasing)
        .map(p => visibilityToToggle === 'minimized' ? p.groupMinimizeEased() : p.groupMaximizeEased());

      this.groupingLanes
        .filter((p, index) => index > maxLaneIndexForEasing)
        .forEach(p => {
          if (visibilityToToggle === 'minimized') {
            p.groupMinimize()
          } else {
            p.groupMaximize()
          }
        });

      forkJoin(osEased$)
        .pipe(take(1))
        .subscribe();
    }
  }

  get visibilityToToggle(): GroupingLaneVisibility {
    if (this.groupingLanes) {
      let minimized = this.groupingLanes.filter(p => p.groupVisibility === 'minimized');
      let maximized = this.groupingLanes.filter(p => p.groupVisibility === 'maximized');

      if (minimized.length === this.groupingLanes.length) {
        return 'maximized';
      } else if (maximized.length === this.groupingLanes.length) {
        return 'minimized';
      } else {
        return 'minimized';
      }
    } else {
      return 'maximized';
    }
  }

  get isDisabled(): boolean {
    return !this.groupingLanes;
  }
}

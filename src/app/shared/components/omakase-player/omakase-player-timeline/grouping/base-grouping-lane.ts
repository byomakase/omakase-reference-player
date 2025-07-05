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

import {ClickEvent, ConfigWithOptionalStyle, ImageButton, LabelLane, LabelLaneConfig, Timeline, TimelineLaneApi, VideoControllerApi} from '@byomakase/omakase-player';
import {forkJoin, map, Observable, of, Subject, take, takeUntil} from 'rxjs';
import {TelemetryLane} from '../../../../../features/timeline/timeline.service';
import {LayoutService} from '../../../../../core/layout/layout.service';

export type GroupingLaneVisibility = 'minimized' | 'maximized';

const maxLaneIndexForEasing = 2;

export interface BaseGroupingLaneConfig extends LabelLaneConfig {}

export abstract class BaseGroupingLane<C extends BaseGroupingLaneConfig> extends LabelLane {
  private _groupMinimizeMaximizeButton: ImageButton;
  private _timelineConfigButton: ImageButton;

  private _childLanes: TimelineLaneApi[] = [];
  private _filteredLanes: Set<string> = new Set<string>();

  private _groupVisibility: GroupingLaneVisibility = 'maximized';
  private _minimizeMaximizeInProgress = false;
  private _onVisbilityChange$: Subject<GroupingLaneVisibility> = new Subject<GroupingLaneVisibility>();

  private _enabled: boolean = true;

  protected constructor(config: ConfigWithOptionalStyle<C>) {
    super(config);

    this._groupMinimizeMaximizeButton = new ImageButton({
      ...LayoutService.themeStyleConstants.IMAGE_BUTTONS.chevronDown,
      listening: true,
    });

    this.addTimelineNode({
      timelineNode: this._groupMinimizeMaximizeButton,
      width: this._groupMinimizeMaximizeButton.config.width!,
      height: this._groupMinimizeMaximizeButton.config.height!,
      justify: 'start',
      margin: [0, 5, 0, 0],
    });

    this._timelineConfigButton = new ImageButton({
      ...LayoutService.themeStyleConstants.IMAGE_BUTTONS.config,
      listening: true,
    });

    this.addTimelineNode({
      timelineNode: this._timelineConfigButton,
      width: this._timelineConfigButton.config.width!,
      height: this._timelineConfigButton.config.height!,
      justify: 'start',
      margin: [0, 5, 0, 0],
    });
  }

  override prepareForTimeline(timeline: Timeline, videoController: VideoControllerApi) {
    super.prepareForTimeline(timeline, videoController);

    this._groupMinimizeMaximizeButton.onClick$.pipe(takeUntil(this._destroyed$)).subscribe({
      next: (event: ClickEvent) => {
        this.toggleGroupVisibility().pipe(take(1)).subscribe();
      },
    });
  }

  addChildLane(lane: TimelineLaneApi) {
    this._childLanes.push(lane);
  }

  toggleGroupVisibility(): Observable<void> {
    let newGroupVisibility: GroupingLaneVisibility = this._groupVisibility === 'minimized' ? 'maximized' : 'minimized';

    if (!this._minimizeMaximizeInProgress) {
      this._minimizeMaximizeInProgress = true;
      let toggle = newGroupVisibility === 'minimized' ? this.groupMinimizeEased() : this.groupMaximizeEased();
      return toggle.pipe(
        map(() => {
          this._minimizeMaximizeInProgress = false;
        })
      );
    } else {
      return of();
    }
  }

  groupMinimizeEased(): Observable<boolean> {
    this._groupMinimizeMaximizeButton.setImage({
      ...LayoutService.themeStyleConstants.IMAGE_BUTTONS.chevronRight,
    });
    let osEased$ = this._childLanes.filter((p, index) => !(p as TelemetryLane).isHidden && index <= maxLaneIndexForEasing).map((p) => p.minimizeEased());

    this._timeline?.minimizeTimelineLanes(this._childLanes.filter((p, index) => !(p as TelemetryLane).isHidden && index > maxLaneIndexForEasing));

    return forkJoin(osEased$).pipe(
      map((p) => {
        this.groupVisibility = 'minimized';
        return true;
      })
    );
  }

  groupMinimize() {
    this._groupMinimizeMaximizeButton.setImage({
      ...LayoutService.themeStyleConstants.IMAGE_BUTTONS.chevronRight,
    });

    this._timeline?.minimizeTimelineLanes(this._childLanes);
    this.groupVisibility = 'minimized';
  }

  groupMaximizeEased(): Observable<boolean> {
    this._groupMinimizeMaximizeButton.setImage({
      ...LayoutService.themeStyleConstants.IMAGE_BUTTONS.chevronDown,
    });

    let osEased$ = this._childLanes.filter((p, index) => !(p as TelemetryLane).isHidden && index <= maxLaneIndexForEasing && !this._filteredLanes.has(p.id)).map((p) => p.maximizeEased());

    this._timeline?.maximizeTimelineLanes(this._childLanes.filter((p, index) => !(p as TelemetryLane).isHidden && index > maxLaneIndexForEasing && !this._filteredLanes.has(p.id)));

    return forkJoin(osEased$).pipe(
      map((p) => {
        this.groupVisibility = 'maximized';
        return true;
      })
    );
  }

  groupMaximize() {
    this._groupMinimizeMaximizeButton.setImage({
      ...LayoutService.themeStyleConstants.IMAGE_BUTTONS.chevronDown,
    });

    this._timeline?.maximizeTimelineLanes(this._childLanes.filter((p) => !(p as TelemetryLane).isHidden && !this._filteredLanes.has(p.id)));
    this.groupVisibility = 'maximized';
  }

  toggleHidden(visibility: GroupingLaneVisibility) {
    if (this.isMinimized()) {
      this.style.textFontSize = this._config.style.textFontSize;
      this.onStyleChange();
      this.maximize();
      visibility === 'minimized' ? this.groupMaximize() : this.groupMinimize();
      this._enabled = true;
    } else {
      this.minimize();
      this.style.textFontSize = 0;
      this.onStyleChange();
      this.groupMinimize();
      this._enabled = false;
    }
  }

  abstract get mediaTrackId(): string;

  get groupVisibility(): GroupingLaneVisibility {
    return this._groupVisibility;
  }

  get isEnabled(): boolean {
    return this._enabled;
  }

  private set groupVisibility(visibility: GroupingLaneVisibility) {
    this._groupVisibility = visibility;
    this._onVisbilityChange$.next(visibility);
  }

  get childLanes(): TimelineLaneApi[] {
    return this._childLanes;
  }

  override get description(): string {
    return this._description ?? '';
  }

  get onConfigClick$(): Observable<ClickEvent> {
    return this._timelineConfigButton.onClick$;
  }

  get onVisibilityChange$(): Observable<GroupingLaneVisibility> {
    return this._onVisbilityChange$;
  }

  filterLane(laneId: string) {
    this._filteredLanes.add(laneId);
  }

  unfilterLane(laneId: string) {
    this._filteredLanes.delete(laneId);
  }
}

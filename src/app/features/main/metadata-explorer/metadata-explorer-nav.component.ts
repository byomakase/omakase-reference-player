import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output, ViewChild} from '@angular/core';
import {NgbDropdown, NgbDropdownButtonItem, NgbNav} from '@ng-bootstrap/ng-bootstrap';
import {CoreModule} from '../../../core/core.module';
import {IconModule} from '../../../shared/components/icon/icon.module';
import {SharedModule} from '../../../shared/shared.module';
import {BehaviorSubject} from 'rxjs';
import {InfoTab, SessionData, SourceInfo} from '../../../model/domain.model';
import {StringUtil} from '../../../util/string-util';
import {MetadataOffcanvasService} from '../metadata-offcanvas/metadata-offcanvas.service';
import {MetadataExplorerService} from './metadata-explorer.service';

@Component({
  selector: 'div[appMetadataExplorerNav]',
  standalone: true,
  imports: [CoreModule, SharedModule, IconModule, NgbDropdownButtonItem],
  template: `
    <div class="d-flex">
      <div class="d-flex flex-grow-1 align-items-center justify-content-between" [class.d-none]="!(showInfo$ | async)" #metadataNav>
        <ul ngbNav #nav="ngbNav" class="nav-pills h-100" (activeIdChange)="onNavChange($event)" [destroyOnHide]="false" [animation]="false">
          <li [ngbNavItem]="'sources'">
            <button ngbNavLink>Sources</button>
            <ng-template ngbNavContent>
              @if (showSources$ | async) {
                @for (source_info of sessionDataFiltered!.data?.source_info; track source_info; let index = $index) {
                  <div ngbAccordion class="mb-2">
                    <div ngbAccordionItem #accordionItem="ngbAccordionItem">
                      <div ngbAccordionHeader class="accordion-button custom-header justify-content-between">
                        <button type="button" class="btn btn-link btn-source-info-name container-fluid text-start text-truncate" ngbAccordionToggle>
                          <i [appIcon]="accordionItem.collapsed ? 'chevron-right' : 'chevron-down'"></i>
                          {{ (sessionData?.data)!.source_info[index].name }}
                        </button>
                        @if (hasMediaInfo((sessionData?.data)!.source_info[index])) {
                          <button type="button" class="btn btn-link btn-metadata d-none d-lg-block text-nowrap" (click)="openMetadata((sessionData?.data)!.source_info[index])">
                            Metadata <i class="ms-1" appIcon="code"></i>
                          </button>
                        }
                      </div>
                      <div ngbAccordionCollapse>
                        <div ngbAccordionBody>
                          <ngx-json-viewer [json]="source_info"></ngx-json-viewer>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              }
            </ng-template>
          </li>
          @if (showInfo$ | async) {
            @for (info_tab of sessionDataFiltered!.data!.presentation.info_tabs; track info_tab; let index = $index) {
              @if (info_tab.type === 'json' && info_tab.visualization === 'json_tree') {
                <li [ngbNavItem]="'info-tab-' + index">
                  <button ngbNavLink>{{ resolveInfoTabName(info_tab, index) }}</button>
                  <ng-template ngbNavContent>
                    <div class="w-100 h-100">
                      <ngx-json-viewer #ngxJsonViewer [json]="info_tab.data" [expanded]="true"></ngx-json-viewer>
                    </div>
                  </ng-template>
                </li>
              }
            }
          }
        </ul>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetadataExplorerNavComponent {
  @ViewChild('nav') nbgNav!: NgbNav;

  @Output()
  readonly getNgbNav: EventEmitter<NgbNav> = new EventEmitter<NgbNav>();

  showSources$ = new BehaviorSubject<boolean>(false);
  showInfo$ = new BehaviorSubject<boolean>(false);

  sessionDataFiltered?: Partial<SessionData>;

  private _sessionData?: SessionData;

  constructor(
    private metadataOffcanvasService: MetadataOffcanvasService,
    private metadataExplorerService: MetadataExplorerService
  ) {}

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return 'metadata-explorer-nav';
  }

  @Input()
  set sessionData(value: SessionData | undefined) {
    this._sessionData = value;

    this.sessionDataFiltered = structuredClone(this._sessionData) as Partial<SessionData>; // we dont want to alter root objec

    this.sessionDataFiltered.data?.source_info.forEach((sourceInfo) => {
      // @ts-ignore
      delete sourceInfo['id'];
      // @ts-ignore
      delete sourceInfo['name'];
    });

    if (this._sessionData?.data.source_info) {
      this.showSources$.next(true);
    }

    if (this._sessionData?.data.presentation.info_tabs && this._sessionData?.data.presentation.info_tabs.length > 0) {
      this.showInfo$.next(true);
    }
  }

  ngAfterViewInit() {
    this.getNgbNav.emit(this.nbgNav);
  }

  resolveInfoTabName(infoTab: InfoTab, index: number): string {
    return !StringUtil.isNullUndefinedOrWhitespace(infoTab.name) ? infoTab.name : `Info ${index + 1}`;
  }

  onNavChange(activeId: string) {
    this.metadataExplorerService.onNavChange(activeId);
  }

  hasMediaInfo(sourceInfo: SourceInfo): boolean {
    return !!this._sessionData && !!this._sessionData.data.media_info.find((p) => p.source_id === sourceInfo.id);
  }

  openMetadata(sourceInfo: SourceInfo) {
    let mediaInfo = this._sessionData?.data.media_info.find((p) => p.source_id === sourceInfo.id);
    if (mediaInfo) {
      this.metadataOffcanvasService.open(sourceInfo, mediaInfo);
    }
  }

  get sessionData(): SessionData | undefined {
    return this._sessionData;
  }
}

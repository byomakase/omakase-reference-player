import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output, ViewChild} from '@angular/core';
import {NgbNav} from '@ng-bootstrap/ng-bootstrap';
import {CoreModule} from '../../../core/core.module';
import {IconModule} from '../../../shared/components/icon/icon.module';
import {SharedModule} from '../../../shared/shared.module';
import {BehaviorSubject} from 'rxjs';
import {InfoTab, SessionData, SourceInfo} from '../../../model/domain.model';
import {StringUtil} from '../../../util/string-util';
import {MetadataOffcanvasService} from '../metadata-offcanvas/metadata-offcanvas.service';
import {MetadataExplorerService} from './metadata-explorer.service';
import {IconName} from '../../../shared/components/icon/icon.service';
import {DownloadService} from '../../../shared/services/download.service';

@Component({
  selector: 'div[appMetadataExplorerNav]',
  standalone: true,
  imports: [CoreModule, SharedModule, IconModule],
  template: `
    <div class="d-flex">
      <div class="d-flex flex-grow-1 align-items-center justify-content-between" [class.d-none]="!(showInfo$ | async)" #metadataNav>
        <ul ngbNav #nav="ngbNav" class="nav-pills h-100" [(activeId)]="metadataExplorerService.navActiveId" (activeIdChange)="onNavChange($event)" [destroyOnHide]="false" [animation]="false">
          @if (showSources$ | async) {
            <li [ngbNavItem]="'sources'">
              <button ngbNavLink (click)="changeTab()">Sources</button>
              <ng-template ngbNavContent>
                @for (source_info of sessionDataFiltered!.data?.source_info; track source_info; let index = $index) {
                  <div ngbAccordion class="mb-2">
                    <div ngbAccordionItem #accordionItem="ngbAccordionItem">
                      @if (hasSourceInfo()) {
                        <div ngbAccordionHeader class="accordion-button custom-header justify-content-between">
                          <button type="button" class="btn btn-link btn-source-info-name container-fluid text-start text-truncate" ngbAccordionToggle>
                            <i [appIcon]="accordionItem.collapsed ? 'chevron-right' : 'chevron-down'"></i>
                            {{ (sessionData?.data)!.source_info![index].name }}
                          </button>
                          @if (hasMediaInfo((sessionData?.data)!.source_info![index])) {
                            <button type="button" class="btn btn-link btn-metadata d-none d-lg-block text-nowrap" (click)="openMetadata((sessionData?.data)!.source_info![index])">
                              Metadata <i class="ms-1" appIcon="code"></i>
                            </button>
                          }
                        </div>
                      }
                      <div ngbAccordionCollapse>
                        <div ngbAccordionBody>
                          <ngx-json-viewer [json]="source_info"></ngx-json-viewer>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </ng-template>
            </li>
          }
          @if (showInfo$ | async) {
            @for (info_tab of sessionDataFiltered!.presentation!.info_tabs; track info_tab; let index = $index) {
              <li [ngbNavItem]="'info-tab-' + index">
                <button ngbNavLink (click)="changeTab(info_tab)">{{ resolveInfoTabName(info_tab, index) }}</button>
                <ng-template ngbNavContent>
                  @if (info_tab.type === 'json' && info_tab.visualization === 'json_tree') {
                    <div class="w-100 h-100">
                      <ngx-json-viewer #ngxJsonViewer [json]="info_tab.data" [expanded]="true"></ngx-json-viewer>
                    </div>
                  } @else if (info_tab.type === 'file_list' && info_tab.visualization === 'list') {
                    @for (info_tab_file of info_tab.files; track info_tab_file; let file_index = $index) {
                      @if (info_tab_file.filename) {
                        <div class="w-100 h-100 file-list">
                          <div class="file-item">
                            <div style="min-width: 70px"><i [appIcon]="getFilenameIcon(info_tab_file.filename)"></i></div>
                            <div class="name">{{ info_tab_file.filename }}</div>
                            <div class="description">{{ info_tab_file.description }}</div>
                            <button type="button" class="btn download-btn" [disabled]="!info_tab_file.url" (click)="downloadService.downloadFile(info_tab_file.url, info_tab_file.filename)">
                              <i appIcon="download"></i>
                            </button>
                          </div>
                        </div>
                      }
                    }
                  } @else if (info_tab.type === 'json' && info_tab.visualization === 'formatted_json') {
                    @for (info_tab_key of objectKeys(info_tab.data); track info_tab_key; let index = $index) {
                      @if (isValidFormattedJsonType(info_tab.data[info_tab_key])) {
                        <div
                          class="formatted-json"
                          [class.map]="isObject(info_tab.data[info_tab_key])"
                          [class.d-none]="!isObject(info_tab.data[info_tab_key]) && filterData(info_tab.data[info_tab_key]) === ''"
                          [class.first]="index === 0"
                        >
                          @if (isObject(info_tab.data[info_tab_key])) {
                            <div class="header" [innerHTML]="toAllCase(StringUtil.toMixedCase(info_tab_key))"></div>
                          }
                          <div class="json-item">
                            @if (isObject(info_tab.data[info_tab_key])) {
                              @for (key of objectKeys(info_tab.data[info_tab_key]); track key) {
                                @if (!isObject(info_tab.data[info_tab_key][key])) {
                                  <div class="d-flex" [class.d-none]="filterData(info_tab.data[info_tab_key][key]) === ''">
                                    <div class="key">{{ StringUtil.toMixedCase(key) }}:</div>
                                    <div class="value indented" [innerHTML]="filterData(info_tab.data[info_tab_key][key])"></div>
                                  </div>
                                }
                              }
                            } @else {
                              <div class="value" [innerHTML]="filterData(info_tab.data[info_tab_key])"></div>
                            }
                          </div>
                        </div>
                      }
                    }
                  }
                </ng-template>
              </li>
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

  StringUtil = StringUtil;

  constructor(
    private metadataOffcanvasService: MetadataOffcanvasService,
    public metadataExplorerService: MetadataExplorerService,
    public downloadService: DownloadService
  ) {}

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return 'metadata-explorer-nav';
  }

  @Input()
  set sessionData(value: SessionData | undefined) {
    this._sessionData = value;

    this.sessionDataFiltered = structuredClone(this._sessionData) as Partial<SessionData>; // we dont want to alter root objec

    if (this.sessionDataFiltered.data?.source_info) {
      this.sessionDataFiltered.data?.source_info.forEach((sourceInfo) => {
        // @ts-ignore
        delete sourceInfo['id'];
        // @ts-ignore
        delete sourceInfo['name'];
      });
    }

    this.showSources$.next(!!this._sessionData?.data.source_info && this._sessionData.data.source_info.length > 0);
    this.showInfo$.next(!!this._sessionData?.presentation?.info_tabs && this._sessionData?.presentation.info_tabs.length > 0);
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

  hasSourceInfo(): boolean {
    return !!this._sessionData && !!this._sessionData.data.source_info;
  }

  hasMediaInfo(sourceInfo: SourceInfo): boolean {
    return !!this._sessionData && !!this._sessionData.data.media_info && !!this._sessionData.data.media_info.find((p) => p.source_id === sourceInfo.id);
  }

  openMetadata(sourceInfo: SourceInfo) {
    let mediaInfo = this._sessionData?.data.media_info?.find((p) => p.source_id === sourceInfo.id);
    if (mediaInfo) {
      this.metadataOffcanvasService.open(sourceInfo, mediaInfo);
    }
  }

  getFilenameIcon(filename: string): IconName | undefined {
    const extensions = ['pdf', 'json', 'txt', 'csv'];

    return extensions.includes(filename.split('.').at(-1)!.toLowerCase()) ? (filename.split('.').at(-1)!.toLowerCase() as IconName) : 'binary';
  }

  changeTab(infoTab: InfoTab | undefined = undefined) {
    this.metadataExplorerService.infoTabHeaderActive = infoTab?.type === 'file_list' && infoTab?.visualization === 'list';
  }

  objectKeys(object: Object): string[] {
    return Object.keys(object);
  }

  isObject(value: any): boolean {
    return typeof value === 'object';
  }

  isValidFormattedJsonType(value: any): boolean {
    return (
      value != null &&
      (typeof value === 'number' || typeof value === 'boolean' || (typeof value === 'string' && value !== '') || (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0))
    );
  }

  filterData(value: any): string | boolean | number {
    if (typeof value === 'number' || typeof value === 'boolean') {
      return value;
    } else {
      let spans = Array.from(value.matchAll(/(<span\b[^>]*>[^<]+)(<\/span>)|<span\b[^>]*>[^<]+$/g), (v: string) => v);
      if (!spans.length) {
        let invalidFormatingMarkup = Array.from(value.matchAll(/(<[^>]*>)([^<]+)(<\/[^>]*>)|(<[^>]*>)([^<]+)$/g), (v: string) => v);
        if (invalidFormatingMarkup.length) {
          let html = '';
          invalidFormatingMarkup.forEach((match) => {
            html += match[2] ?? match[5];
          });

          return html;
        }

        let text = value.match(/^[^<>]+$/g);

        return text ? text : '';
      }

      let html = '';
      spans.forEach((span) => {
        html += (span[1] ?? span[0]) + '</span>';
      });

      return html;
    }
  }

  toAllCase(value: string): string {
    return value.toUpperCase();
  }

  get sessionData(): SessionData | undefined {
    return this._sessionData;
  }
}

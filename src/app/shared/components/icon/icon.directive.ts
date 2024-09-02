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

import {ChangeDetectorRef, Directive, ElementRef, HostBinding, Input, OnChanges, SimpleChanges} from '@angular/core';
import {IconName, IconService} from './icon.service';

@Directive({
  selector: 'i[appIcon]'
})
export class IconDirective implements OnChanges {
  @Input() appIcon?: IconName;

  @HostBinding('class.icon') cssClassIcon = true;

  constructor(private elementRef: ElementRef,
              private changeDetectorRef: ChangeDetectorRef,
              private appIconService: IconService) {
  }

  ngOnChanges(changes: SimpleChanges) {
    let name: IconName = changes['appIcon'].currentValue;

    let cssClassFriendlyName = name ? name.replace(/[^a-z0-9_-]/gi, '-') : '';

    this.elementRef.nativeElement.classList.add(`icon`, `${cssClassFriendlyName}`)

    const html = this.appIconService.getIconHtml(name);

    if (html) {
      this.elementRef.nativeElement.innerHTML = html;
      this.changeDetectorRef.markForCheck();
    } else {
      console.warn(`Icon not found: ${name}`);
    }
  }
}

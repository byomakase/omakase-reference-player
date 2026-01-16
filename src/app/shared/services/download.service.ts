import { HttpClient } from '@angular/common/http';
import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DownloadService {
  constructor(private httpClient: HttpClient) {}

  downloadFile(fileUrl: string, fileName: string) {
    this.httpClient
      .get(fileUrl, {
        responseType: 'blob',
      })
      .subscribe({
        next: (data) => {
          this.initiateDownload(data, fileName);
        },
      });
  }

  downloadText(text: string, filename: string) {
    const blob = new Blob([text]);
    this.initiateDownload(blob, filename);
  }

  private initiateDownload(file: Blob, filename: string) {
    const url = URL.createObjectURL(file);

    const transientAnchor = document.createElement('a');
    transientAnchor.setAttribute('href', url);
    transientAnchor.setAttribute('download', filename);

    document.body.appendChild(transientAnchor);
    transientAnchor.click();
    document.body.removeChild(transientAnchor);

    URL.revokeObjectURL(url);
  }
}

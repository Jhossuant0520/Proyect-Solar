import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CePageHeaderComponent } from '../../../../shared/components/ce-page-header/ce-page-header';
import { CeCardComponent } from '../../../../shared/components/ce-card/ce-card';
import { CeSectionHeaderComponent } from '../../../../shared/components/ce-section-header/ce-section-header';
import { REPORTES_HUB_CARDS } from '../reportes-ui';

@Component({
  selector: 'app-reportes-hub',
  standalone: true,
  imports: [RouterLink, CePageHeaderComponent, CeCardComponent, CeSectionHeaderComponent],
  templateUrl: './reportes-hub.html',
  styleUrl: './reportes-hub.scss'
})
export class ReportesHubComponent {
  readonly cards = REPORTES_HUB_CARDS;
}

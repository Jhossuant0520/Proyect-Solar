import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SolvixPageHeaderComponent } from '../../../../shared/components/solvix-page-header/solvix-page-header';
import { SolvixCardComponent } from '../../../../shared/components/solvix-card/solvix-card';
import { SolvixSectionHeaderComponent } from '../../../../shared/components/solvix-section-header/solvix-section-header';
import { REPORTES_HUB_CARDS } from '../reportes-ui';

@Component({
  selector: 'app-reportes-hub',
  standalone: true,
  imports: [RouterLink, SolvixPageHeaderComponent, SolvixCardComponent, SolvixSectionHeaderComponent],
  templateUrl: './reportes-hub.html',
  styleUrl: './reportes-hub.scss'
})
export class ReportesHubComponent {
  readonly cards = REPORTES_HUB_CARDS;
}

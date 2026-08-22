import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrls: ['./contact.scss']
})
export class Contact {
  whatsappUrl = 'https://wa.me/573172901206?text=' + encodeURIComponent('Hola, quiero información sobre SOLVIX.');
  sent = false;

  form = {
    name: '',
    email: '',
    subject: 'support',
    message: '',
    privacy: false
  };

  onSubmit() {
    if (!this.form.privacy) {
      return;
    }
    this.sent = true;
  }
}

import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailService } from './mail.service.js';

@Module({
  imports : [
    MailerModule.forRoot({
      transport : {
        host : 'smtp.gmail.com' , 
        port : 587 , 
        secure : false ,
        auth : {
          user : process.env.GMAIL_USER ,
          pass : process.env.GMAIL_APP_PASSWORD
        }
      }
    })
  ] ,
  providers: [MailService],
  exports : [MailService]
})
export class MailModule {}

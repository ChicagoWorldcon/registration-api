const fs = require('fs');
const mustache = require('mustache');
const SendGrid  = require('sendgrid');
const tfm = require('tiny-frontmatter');
const wrap = require('wordwrap')(72);

class Mailer {
  constructor(tmplDir, tmplSuffix, sendgridApiKey) {
    this.tmplDir = tmplDir;
    this.tmplSuffix = tmplSuffix;
    this.sendgrid = SendGrid(sendgridApiKey);
  }

  tmplFileName(tmplName) {
    return [ this.tmplDir, '/', tmplName, this.tmplSuffix ].filter(s => s).join('');
  }

  sgRequest(recipient, { from, fromname, subject }, msg) {
    return this.sendgrid.emptyRequest({
      method: 'POST',
      path: '/v3/mail/send',
      body: {
        personalizations: [{
          to: [{ email: recipient }],
        }],
        from: {
          email: from,
          name: fromname,
        },
        subject: subject,
        content: [{
          type: 'text/plain',
          value: wrap(msg)
        }]
      }
    });
  }

  sendEmail(tmplName, data, done) {
    fs.readFile(this.tmplFileName(tmplName), 'utf8', (err, raw) => {
      if (err) return done(err);
      try {
        const {attributes, body} = tfm(raw);
        const msg = mustache.render(body, data);
        const request = this.sgRequest(data.email, attributes, msg);
        this.sendgrid.API(request, (err, response) => {
          if (err) {
            console.warn('SendGrid error', response);
            done(err, response);
          } else {
            done(null, { to: data.email });
          }
        });
      } catch (err) {
        done(err);
      }
    });
  }
}

module.exports = Mailer;
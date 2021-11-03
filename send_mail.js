const nodemailer = require("nodemailer");

async function sendMail(subject, content, recipients, html) {
    let account = await nodemailer.createTestAccount();

    let transporter = nodemailer.createTransport({
        host: "email-smtp.us-east-1.amazonaws.com",
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: '', // generated ethereal user
            pass: '' // generated ethereal password
        }
    });

    let mailOptions = {
        from: '"lifayi@elastos.org" <lifayi@elastos.org>', // sender address
        to: recipients, // list of receivers, comma separate
        subject: subject, // Subject line
        text: content, // plain text body
        html: html // html body
    };

    try {

        let info = await transporter.sendMail(mailOptions);
    } catch(e) {
        console.log(e);
    }
    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}

module.exports = sendMail;

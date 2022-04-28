const { OAuth2 } = google.auth

//Credenciales de autenticación chatbotcr
const oAuth2Client = new OAuth2(
    '',
    ''
  )
oAuth2Client.setCredentials({
    refresh_token: '',
})

module.exports={
    oAuth2Client
}
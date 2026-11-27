# "ok Jarvis" no Windows: escuta o microfone (reconhecimento de fala offline do próprio Windows)
# e abre o app JARVIS quando ouvir "ok Jarvis". Roda escondido em segundo plano.
$ErrorActionPreference = 'Stop'
$URL = 'https://eiyago.github.io/leadsite-v2/jarvis.html?ouvir=1'
$PASTA = Split-Path -Parent $MyInvocation.MyCommand.Path
$LOG = Join-Path $PASTA 'ok-jarvis.log'
function Log($m) { "$(Get-Date -f 'dd/MM HH:mm:ss') $m" | Out-File -FilePath $LOG -Append -Encoding utf8 }

function Abrir-App {
  $edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
  $chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
  $nav = if ($edge) { $edge } else { $chrome }
  if ($nav) { Start-Process $nav "--app=$URL" } else { Start-Process $URL }
}

Add-Type -AssemblyName System.Speech
$recs = [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers()
if (-not $recs -or $recs.Count -eq 0) {
  Log 'Nenhum reconhecedor de fala do Windows instalado.'
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show("Para o 'ok Jarvis' funcionar com tudo fechado, o Windows precisa do reconhecimento de fala.`n`nVou abrir Configurações > Hora e idioma > Fala. Adicione 'English (United States)' (ou Português) com a opção de reconhecimento de fala e reinicie o computador.`n`nEnquanto isso, o 'ok Jarvis' funciona dentro do app JARVIS aberto.", 'JARVIS') | Out-Null
  Start-Process 'ms-settings:speech'
  exit 1
}
$rec = $recs | Where-Object { $_.Culture.Name -eq 'pt-BR' } | Select-Object -First 1
if (-not $rec) { $rec = $recs | Where-Object { $_.Culture.Name -like 'en-*' } | Select-Object -First 1 }
if (-not $rec) { $rec = $recs[0] }
Log "Reconhecedor: $($rec.Name) ($($rec.Culture.Name))"

$motor = New-Object System.Speech.Recognition.SpeechRecognitionEngine $rec
$frases = New-Object System.Speech.Recognition.Choices
foreach ($f in 'ok jarvis', 'okay jarvis', 'hey jarvis', 'oi jarvis', 'jarvis') { $frases.Add($f) }
$gb = New-Object System.Speech.Recognition.GrammarBuilder; $gb.Culture = $rec.Culture; $gb.Append($frases)
$motor.LoadGrammar((New-Object System.Speech.Recognition.Grammar $gb))
$motor.SetInputToDefaultAudioDevice()
Log 'Ouvindo "ok Jarvis"...'
$ultimo = [datetime]::MinValue
while ($true) {
  $r = $motor.Recognize([TimeSpan]::FromSeconds(30))
  if ($r -and $r.Confidence -ge 0.75 -and ((Get-Date) - $ultimo).TotalSeconds -gt 8) {
    $ultimo = Get-Date
    Log "Detectado '$($r.Text)' (confiança $([math]::Round($r.Confidence,2))) -> abrindo o app"
    Abrir-App
  }
}

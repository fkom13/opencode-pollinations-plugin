/audio/{text}​Copy link
Generate audio from text — speech (TTS) or music.

Models: Use model query param to select:

TTS (default): elevenlabs, tts-1, etc.
Music: elevenmusic (or music)
TTS Voices: alloy, echo, fable, onyx, nova, shimmer, ash, ballad, coral, sage, verse, rachel, domi, bella, elli, charlotte, dorothy, sarah, emily, lily, matilda, adam, antoni, arnold, josh, sam, daniel, charlie, james, fin, callum, liam, george, brian, bill

Output Formats (TTS only): mp3, opus, aac, flac, wav, pcm

Music options: duration in seconds (3-300), instrumental=true

Authentication:

Include your API key either:

In the Authorization header as a Bearer token: Authorization: Bearer YOUR_API_KEY
As a query parameter: ?key=YOUR_API_KEY
API keys can be created from your dashboard at enter.pollinations.ai.

Path Parameters
textCopy link to text
Type:string
min length:  
1
required
Example
Text to convert to speech, or a music description when model=elevenmusic

Query Parameters
voiceCopy link to voice
Type:string
enum
default: 
"alloy"
Example
Voice to use for speech generation (TTS only)

alloy
echo
fable
onyx
shimmer
Show all values
response_formatCopy link to response_format
Type:string
enum
default: 
"mp3"
Example
Audio output format (TTS only)

mp3
opus
aac
flac
wav
pcm
modelCopy link to model
Type:string
Example
Audio model: TTS (default) or elevenmusic for music generation

durationCopy link to duration
Type:string
Example
Music duration in seconds, 3-300 (elevenmusic only)

instrumentalCopy link to instrumental
Type:string
enum
default: 
"false"
Example
If true, guarantees instrumental output (elevenmusic only)

true
false
keyCopy link to key
Type:string
API key (alternative to Authorization header)

Responses

200
audio/mpeg
Success - Returns audio data

Type:string
Format:binary
binary data, used to describe files


400
application/json
Something was wrong with the input data, check the details for more info.

Type:object
error
Type:object
required
Hide Child Attributesfor error
code
const:  
BAD_REQUEST
required
details
Type:ValidationErrorDetails
required
Hide Child Attributesfor details
fieldErrors
Type:object
required
Show Child Attributesfor fieldErrors
formErrors
Type:array string[]
required
name
Type:string
required
stack
Type:string
message
required

Any of
const
const:  
Something was wrong with the input data, check the details for more info.
timestamp
Type:string
required
cause
requestId
Type:string
status
const:  
400
required
success
Type:const
const:  
false
required

401
application/json
Authentication required. Please provide an API key via Authorization header (Bearer token) or ?key= query parameter.

Type:object
error
Type:object
required
Hide Child Attributesfor error
code
const:  
UNAUTHORIZED
required
details
Type:ErrorDetails
required
Show Child Attributesfor details
message
required

Any of
const
const:  
Authentication required. Please provide an API key via Authorization header (Bearer token) or ?key= query parameter.
timestamp
Type:string
required
cause
requestId
Type:string
status
const:  
401
required
success
Type:const
const:  
false
required

402
application/json
Insufficient pollen balance or API key budget exhausted.

Type:object
error
Type:object
required
Hide Child Attributesfor error
code
const:  
PAYMENT_REQUIRED
required
details
Type:ErrorDetails
required
Show Child Attributesfor details
message
required

Any of
const
const:  
Insufficient pollen balance or API key budget exhausted.
timestamp
Type:string
required
cause
requestId
Type:string
status
const:  
402
required
success
Type:const
const:  
false
required

403
application/json
Access denied! You don't have the required permissions for this resource or model.

Type:object
error
Type:object
required
Hide Child Attributesfor error
code
const:  
FORBIDDEN
required
details
Type:ErrorDetails
required
Hide Child Attributesfor details
name
Type:string
required
stack
Type:string
message
required

Any of
const
const:  
Access denied! You don't have the required permissions for this resource or model.
timestamp
Type:string
required
cause
requestId
Type:string
status
const:  
403
required
success
Type:const
const:  
false
required

500
application/json
Oh snap, something went wrong on our end. We're on it!

Type:object
error
Type:object
required
Hide Child Attributesfor error
code
const:  
INTERNAL_ERROR
required
details
Type:ErrorDetails
required
Hide Child Attributesfor details
name
Type:string
required
stack
Type:string
message
required

Any of
const
const:  
Oh snap, something went wrong on our end. We're on it!
timestamp
Type:string
required
cause
requestId
Type:string
status
const:  
500
required
success
Type:const
const:  
false
required
Request Example forget/audio/{text}
Shell Curl
curl 'https://gen.pollinations.ai/audio/Hello, welcome to Pollinations!' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'


Test Request
(get /audio/{text})
Status:200
Status:400
Status:401
Status:402
Status:403
Status:500
@filename

Success - Returns audio data

/v1/audio/speech​Copy link
Generate audio from text — speech (TTS) or music.

This endpoint is OpenAI TTS API compatible. Set model to elevenmusic (or alias music) to generate music instead of speech.

TTS Voices: alloy, echo, fable, onyx, nova, shimmer, ash, ballad, coral, sage, verse, rachel, domi, bella, elli, charlotte, dorothy, sarah, emily, lily, matilda, adam, antoni, arnold, josh, sam, daniel, charlie, james, fin, callum, liam, george, brian, bill

Output Formats (TTS only): mp3, opus, aac, flac, wav, pcm

Body
application/json
inputCopy link to input
Type:string
min length:  
1
max length:  
4096
required
Example
The text to generate audio for. Maximum 4096 characters.

durationCopy link to duration
Type:number
min:  
3
max:  
300
Example
Music duration in seconds, 3-300 (elevenmusic only)

instrumentalCopy link to instrumental
Type:boolean
If true, guarantees instrumental output (elevenmusic only)

modelCopy link to model
Type:string
response_formatCopy link to response_format
Type:string
enum
default: 
"mp3"
Example
The audio format for the output.

mp3
opus
aac
flac
wav
pcm
speedCopy link to speed
Type:number
min:  
0.25
max:  
4
default: 
1
Example
The speed of the generated audio. 0.25 to 4.0, default 1.0.

voiceCopy link to voice
Type:string
enum
default: 
"alloy"
Example
The voice to use. Available voices: alloy, echo, fable, onyx, nova, shimmer, ash, ballad, coral, sage, verse, rachel, domi, bella, elli, charlotte, dorothy, sarah, emily, lily, matilda, adam, antoni, arnold, josh, sam, daniel, charlie, james, fin, callum, liam, george, brian, bill.

alloy
echo
fable
onyx
shimmer
ash
ballad
coral
sage
verse
rachel
domi
bella
elli
charlotte
dorothy
sarah
emily
lily
matilda
adam
antoni
arnold
josh
sam
daniel
charlie
james
fin
callum
liam
george
brian
bill
Hide values
Responses

200
Selected Content Type:
audio/mpeg
Success - Returns audio data

Type:string
Format:binary
binary data, used to describe files


400
application/json
Something was wrong with the input data, check the details for more info.

Type:object
error
Type:object
required
Hide Child Attributesfor error
code
const:  
BAD_REQUEST
required
details
Type:ValidationErrorDetails
required
Hide Child Attributesfor details
fieldErrors
Type:object
required
Show Child Attributesfor fieldErrors
formErrors
Type:array string[]
required
name
Type:string
required
stack
Type:string
message
required

Any of
const
const:  
Something was wrong with the input data, check the details for more info.
timestamp
Type:string
required
cause
requestId
Type:string
status
const:  
400
required
success
Type:const
const:  
false
required

401
application/json
Authentication required. Please provide an API key via Authorization header (Bearer token) or ?key= query parameter.

Type:object
error
Type:object
required
Hide Child Attributesfor error
code
const:  
UNAUTHORIZED
required
details
Type:ErrorDetails
required
Hide Child Attributesfor details
name
Type:string
required
stack
Type:string
message
required

Any of
const
const:  
Authentication required. Please provide an API key via Authorization header (Bearer token) or ?key= query parameter.
timestamp
Type:string
required
cause
requestId
Type:string
status
const:  
401
required
success
Type:const
const:  
false
required

500
application/json
Oh snap, something went wrong on our end. We're on it!

Type:object
error
Type:object
required
Hide Child Attributesfor error
code
const:  
INTERNAL_ERROR
required
details
Type:ErrorDetails
required
Hide Child Attributesfor details
name
Type:string
required
stack
Type:string
message
required

Any of
const
const:  
Oh snap, something went wrong on our end. We're on it!
timestamp
Type:string
required
cause
requestId
Type:string
status
const:  
500
required
success
Type:const
const:  
false
required


/v1/audio/transcriptions​Copy link
Transcribe audio to text using Whisper or ElevenLabs Scribe.

This endpoint is OpenAI Whisper API compatible.

Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm

Models: whisper-large-v3 (default), whisper-1, scribe

Body
required
multipart/form-data
fileCopy link to file
Type:string
Format:binary
required
The audio file to transcribe. Supported formats: mp3, mp4, mpeg, mpga, m4a, wav, webm.

languageCopy link to language
Type:string
Language of the audio in ISO-639-1 format (e.g. en, fr). Improves accuracy.

modelCopy link to model
Type:string
default: 
"whisper-large-v3"
The model to use. Options: whisper-large-v3, whisper-1, scribe.

promptCopy link to prompt
Type:string
Optional text to guide the model's style or continue a previous segment.

response_formatCopy link to response_format
Type:string
enum
default: 
"json"
The format of the transcript output.

json
text
srt
verbose_json
vtt
temperatureCopy link to temperature
Type:number
Sampling temperature between 0 and 1. Lower is more deterministic.

Responses

200
application/json
Success - Returns transcription

Type:object
text
Type:string

400
application/json
Something was wrong with the input data, check the details for more info.

Type:object
error
Type:object
required
Hide Child Attributesfor error
code
const:  
BAD_REQUEST
required
details
Type:ValidationErrorDetails
required
Hide Child Attributesfor details
fieldErrors
Type:object
required
Hide Child Attributesfor fieldErrors
propertyName
Type:array string[]
formErrors
Type:array string[]
required
name
Type:string
required
stack
Type:string
message
required

Any of
const
const:  
Something was wrong with the input data, check the details for more info.
timestamp
Type:string
required
cause
requestId
Type:string
status
const:  
400
required
success
Type:const
const:  
false
required

401
application/json
Authentication required. Please provide an API key via Authorization header (Bearer token) or ?key= query parameter.

Type:object
error
Type:object
required
Hide Child Attributesfor error
code
const:  
UNAUTHORIZED
required
details
Type:ErrorDetails
required
Show Child Attributesfor details
message
required

Any of
const
const:  
Authentication required. Please provide an API key via Authorization header (Bearer token) or ?key= query parameter.
timestamp
Type:string
required
cause
requestId
Type:string
status
const:  
401
required
success
Type:const
const:  
false
required

500
application/json
Oh snap, something went wrong on our end. We're on it!

Type:object
error
Type:object
required
Hide Child Attributesfor error
code
const:  
INTERNAL_ERROR
required
details
Type:ErrorDetails
required
Show Child Attributesfor details
message
required

Any of
const
const:  
Oh snap, something went wrong on our end. We're on it!
timestamp
Type:string
required
cause
requestId
Type:string
status
const:  
500
required
success
Type:const
const:  
false
required

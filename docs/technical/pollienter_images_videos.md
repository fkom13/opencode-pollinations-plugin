/image/{prompt}​Copy link
Generate an image or video from a text prompt.

Image Models: flux (default), turbo, gptimage, kontext, seedream, nanobanana, nanobanana-pro

Video Models: veo, seedance

veo: Text-to-video only (4-8 seconds)
seedance: Text-to-video and image-to-video (2-10 seconds)
Authentication:

Include your API key either:

In the Authorization header as a Bearer token: Authorization: Bearer YOUR_API_KEY
As a query parameter: ?key=YOUR_API_KEY
API keys can be created from your dashboard at enter.pollinations.ai.

Path Parameters
promptCopy link to prompt
Type:string
min length:  
1
required
Example
Text description of the image or video to generate

Query Parameters
modelCopy link to model
Type:string
enum
default: 
"zimage"
AI model. Image: flux, zimage, turbo, gptimage, kontext, seedream, seedream-pro, nanobanana. Video: veo, seedance, seedance-pro

kontext
nanobanana
nanobanana-pro
seedream
seedream-pro
gptimage
gptimage-large
flux
zimage
veo
seedance
seedance-pro
wan
klein
klein-large
imagen-4
grok-video
ltx-2
Hide values
widthCopy link to width
Type:integer
min:  
0
max:  
9007199254740991
default: 
1024
Image width in pixels

heightCopy link to height
Type:integer
min:  
0
max:  
9007199254740991
default: 
1024
Image height in pixels

seedCopy link to seed
Type:integer
min:  
-1
max:  
2147483647
default: 
0
Random seed for reproducible results. Use -1 for random.

enhanceCopy link to enhance
Type:boolean
default: 
false
Let AI improve your prompt for better results

negative_promptCopy link to negative_prompt
Type:string
default: 
"worst quality, blurry"
What to avoid in the generated image

safeCopy link to safe
Type:boolean
default: 
false
Enable safety content filters

qualityCopy link to quality
Type:string
enum
default: 
"medium"
Image quality level (gptimage only)

low
medium
high
hd
imageCopy link to image
Type:string
Reference image URL(s). Comma/pipe separated for multiple. For veo: image[0]=first frame, image[1]=last frame (interpolation)

transparentCopy link to transparent
Type:boolean
default: 
false
Generate with transparent background (gptimage only)

durationCopy link to duration
Type:integer
min:  
1
max:  
10
Video duration in seconds (video models only). veo: 4, 6, or 8. seedance: 2-10

aspectRatioCopy link to aspectRatio
Type:string
Video aspect ratio: 16:9 or 9:16 (veo, seedance)

audioCopy link to audio
Type:boolean
default: 
false
Enable audio generation for video (veo only)

Responses

200
Selected Content Type:
image/png
Success - Returns the generated image or video

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

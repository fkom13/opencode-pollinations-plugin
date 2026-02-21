/v1/models​Copy link
Get available text models (OpenAI-compatible). If an API key with model restrictions is provided, only allowed models are returned.

Responses

200
application/json
Success

Type:object
OpenAI-compatible list of available models.

data
Type:array object[]
required
OpenAI-compatible model object

Hide Child Attributesfor data
created
Type:number
required
id
Type:string
required
object
const:  
model
required
object
const:  
list
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


/image/models​Copy link
Get a list of available image generation models with pricing, capabilities, and metadata. If an API key with model restrictions is provided, only allowed models are returned.

Responses

200
application/json
Success

Type:array object[]
List of models with pricing and metadata


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


/text/models​Copy link
Get a list of available text generation models with pricing, capabilities, and metadata. If an API key with model restrictions is provided, only allowed models are returned.

Responses

200
application/json
Success

Type:array object[]
List of models with pricing and metadata


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


/audio/models​Copy link
Get a list of available audio models with pricing, capabilities, and metadata. If an API key with model restrictions is provided, only allowed models are returned.

Responses

200
application/json
Success

Type:array object[]
List of models with pricing and metadata


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

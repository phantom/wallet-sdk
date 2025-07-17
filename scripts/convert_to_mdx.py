import os
from openai import OpenAI
import sys

with open(sys.argv[1]) as f:
    original_mdx = f.read()

with open(sys.argv[2]) as f:
    md_content = f.read()

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

print("Converting Markdown to MDX...")
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{
        "role": "user", 
        "content": f"Convert this Markdown file to Mintlify-compatible MDX:\n\n{md_content}\n\nMake sure it looks like the following original, only adjust the absolutely necessary items. Original:\n\n{original_mdx}"
    }]
)

print(response)
# Access the response content
result = response.choices[0].message.content

with open("converted.mdx", "w") as f:
    f.write(result)
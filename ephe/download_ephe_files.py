import re
import requests
from bs4 import BeautifulSoup

url = "http://www.astro.com/ftp/swisseph/ephe/"
response = requests.get(url)

if response.status_code == 200:
    soup = BeautifulSoup(response.text, 'html.parser')
    file_links = soup.find_all('a', href=True)

    for link in file_links:
        file_url = link['href']
        if re.match(r'se(pl|mo)_.*\.se1|seplm18\.se1', file_url):
            file_response = requests.get(url + file_url)
            if file_response.status_code == 200:
                with open(file_url, 'wb') as f:
                    f.write(file_response.content)
                    print(f"Downloaded: {file_url}")
            else:
                print(f"Error downloading {file_url}: {file_response.status_code}")
else:
    print(f"Error accessing URL: {response.status_code}")

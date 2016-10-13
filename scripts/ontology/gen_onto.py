import csv
import urllib
import itertools
from sets import Set
import json
import traceback


class ACSResolver(object):

    def __init__(self):
        self.already_resolved = Set()

    @staticmethod
    def _is_acs_type(region_type, acs_id):
        if (region_type=='msa'):
            if "310M200" in acs_id: return True
        elif (region_type=='state'):
            if "0400000" in acs_id: return True
        elif ("region_type")=='place':
            if "1600000" in acs_id: return True
        elif ("region_type")=="county":
            if "0500000" in acs_id: return True
        elif ("region_type")=="zip_code":
            if "8600000" in acs_id: return True
        else:
            return False

    def resolve(self, city, state):
        """
        Resolves ACS id and autosuggest name by fuzzy tokenized lookup
        @return id,autosuggest_name
        """
        try:
            query = city + " " + state
            if query in self.already_resolved:
                raise RuntimeError("already checked " + city)

            print "\nattempting fuzzy resolution of ACS code for " + query
            print "https://odn.data.socrata.com/resource/7g2b-8brv.json?$select=id,autocomplete_name&$q="+query+"&$order=population%20desc&$limit=5"

            response = urllib.urlopen("https://odn.data.socrata.com/resource/7g2b-8brv.json?$select=id,autocomplete_name&$q="+query+"&$order=population%20desc&$limit=5")
            content = response.read()
            json_match_results = json.loads(content)

            if len(json_match_results) < 1:
                raise RuntimeError("not enough results")

            for i, item in enumerate(json_match_results):
                id=item["id"]
                name = item["autocomplete_name"]
                if "1600000" in id:
                    print "********************  resolved id="+str(id)+", name="+str(name)
                    self.already_resolved.add(name)
                    return id,name
                else:
                    print "tossing " + name + ", not a place"
        except:
            traceback.print_stack()

def init_entry(n, onto, state, state_abbreviations, resolver):
    if n not in onto:
        resolve_and_add_acs(n,state, onto, state_abbreviations, resolver)

def add_syn(s, onto, n):
    s = s.strip()
    if s not in onto[n]['synonyms']:
        onto[n]['synonyms'].append(s)

def resolve_and_add_acs(city, state, onto, state_abbreviations, resolver):
    #@TODO add state for more disambiguation
    if state in state_abbreviations:
        state=state_abbreviations[state]

    try:
        id, name = resolver.resolve(city, state)
        onto[n] = dict()
        onto[n]['synonyms'] = []
        onto[city]['acs']=id
        onto[city]['normal_name'] = name
    except Exception as error:
        print error.message
        print "skipping " + city + " " + state +" - cant resolve acs"
        raise "skipping " + city + " " + state +" - cant resolve acs"

def get_state_abbreviations():
    state_abbreviations = dict()
    with open("state_abbreviations.txt", 'r') as f:
        second_lines = []
        for x in itertools.islice(f, 0, None, 2):
            second_lines.append(x.rstrip())

    i = 0
    with open("state_abbreviations.txt", 'r') as f:
        for line in itertools.islice(f, 1, None, 2):
            state_abbreviations[line.rstrip()] = second_lines[i]
            i += 1

    return state_abbreviations

#start processing
MAX_RESULTS=1000000
state_abbreviations=get_state_abbreviations()

onto = dict()
acs_resolver=ACSResolver()
with open("place-syns-misspellings-raw.txt", 'rb') as f:
    reader = csv.DictReader(f, delimiter='\t', quoting=csv.QUOTE_NONE)
    #print reader.fieldnames

    i=0
    for r in reader:
        i+=1
        if i>MAX_RESULTS: break
        if len(r['name'])>1:
            n=r['name'].strip()
            print n
            state = r['state'].split("(")[1].split(", ")[1].split(" ")[0]
            try:
                init_entry(n, onto, state, state_abbreviations, acs_resolver)

                if 'state' not in onto[n]:
                    onto[n]['state']=state

                m = r['misspell'].split("Commonly misspelled as")
                add_syn(m[1], onto, n)
            except Exception as error:
                print error.message
                print "skipping " + n

#print onto

with open("place-syns-nickname-raw.txt", 'rb') as f:
    reader = csv.DictReader(f, delimiter='\t', quoting=csv.QUOTE_NONE)
    #print reader.fieldnames

    i=0
    for r in reader:
        i+=1
        if i>MAX_RESULTS: break
        try:
            city = r['name'].split(", ")[0].strip()
            state = r['name'].split(", ")[1].strip().split("(")[0].strip()
            init_entry(n, onto, state, state_abbreviations, acs_resolver)
            print state
            if 'state' not in onto[n]:
                onto[n]['state']=state

            nickname = r['nickname'].split("(")[0].strip()
            add_syn(nickname, onto, city)
            #print "\n"
        except Exception as error:
            print error.message
            print "skipping " + n

import json
json.dump(onto, open('place-synonyms.json', 'wb'))
import json
import urllib.request
import sys
sys.stdout.reconfigure(encoding='utf-8')

login_data = json.dumps({'username': 'admin', 'password': 'admin123A'}).encode('utf-8')
login_req = urllib.request.Request('http://localhost:8000/api/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
login_resp = urllib.request.urlopen(login_req)
token = json.loads(login_resp.read())['access_token']

items_data = [
    {'name': 'Удостоверение инспектора ГАИ (1936 г.)', 'category_id': 1, 'description': 'Удостоверение сотрудника Государственной автомобильной инспекции, выданное в 1936 году. Документ содержит фотографию владельца, его ФИО и должность.', 'storage_location_id': 1, 'condition_id': 2, 'acquisition_method_id': 1, 'acquisition_date': '2020-03-15', 'material_ids': [1], 'dating': '1936', 'technique': 'Типографская печать'},
    {'name': 'Фотография поста ГАИ на Невском проспекте', 'category_id': 2, 'description': 'Чёрно-белая фотография поста Госавтоинспекции на Невском проспекте в Ленинграде, 1960-е годы.', 'storage_location_id': 1, 'condition_id': 1, 'acquisition_method_id': 3, 'acquisition_date': '2019-06-20', 'material_ids': [1], 'dating': '1960-е', 'place_of_creation': 'Ленинград'},
    {'name': 'Форменный китель инспектора (1970-е)', 'category_id': 3, 'description': 'Форменный китель инспектора ГАИ образца 1970-х годов. Тёмно-синего цвета, с погонами старшего лейтенанта.', 'storage_location_id': 2, 'condition_id': 2, 'acquisition_method_id': 1, 'acquisition_date': '2021-11-10', 'material_ids': [4], 'dating': '1970-е', 'length': 720, 'width': 550},
    {'name': 'Жезл регулировщика (1950-е)', 'category_id': 4, 'description': 'Чёрно-белый полосатый жезл регулировщика дорожного движения. Деревянная основа с окраской.', 'storage_location_id': 2, 'condition_id': 3, 'acquisition_method_id': 3, 'acquisition_date': '2018-04-01', 'material_ids': [3], 'dating': '1950-е', 'length': 400, 'weight': 250},
    {'name': 'Медаль «За безупречную службу» III степени', 'category_id': 5, 'description': 'Медаль за безупречную службу в органах МВД, III степень. Вручена сотруднику ГАИ за 10 лет безупречной службы.', 'storage_location_id': 1, 'condition_id': 1, 'acquisition_method_id': 1, 'acquisition_date': '2022-02-23', 'material_ids': [2], 'dating': '1985'},
    {'name': 'Правила дорожного движения (издание 1961 года)', 'category_id': 6, 'description': 'Брошюра с Правилами дорожного движения, утверждёнными в 1961 году. Содержит иллюстрации дорожных знаков.', 'storage_location_id': 1, 'condition_id': 2, 'acquisition_method_id': 4, 'acquisition_date': '2023-09-05', 'material_ids': [1], 'dating': '1961'},
    {'name': 'Свисток регулировщика', 'category_id': 4, 'description': 'Металлический свисток, использовавшийся регулировщиками дорожного движения в 1940-1950-х годах.', 'storage_location_id': 3, 'condition_id': 3, 'acquisition_method_id': 1, 'acquisition_date': '2020-07-12', 'material_ids': [2], 'dating': '1940-е', 'weight': 35},
    {'name': 'Нагрудный знак «Отличник милиции»', 'category_id': 5, 'description': 'Нагрудный знак, вручавшийся сотрудникам милиции за отличную службу. Латунь, эмаль.', 'storage_location_id': 1, 'condition_id': 1, 'acquisition_method_id': 1, 'acquisition_date': '2021-05-09', 'material_ids': [2], 'dating': '1975'},
    {'name': 'Фуражка сотрудника ГАИ (1980-е)', 'category_id': 3, 'description': 'Форменная фуражка сотрудника ГАИ образца 1980-х годов. Синего цвета с красным околышем и кокардой.', 'storage_location_id': 2, 'condition_id': 2, 'acquisition_method_id': 3, 'acquisition_date': '2019-12-01', 'material_ids': [4], 'dating': '1980-е'},
    {'name': 'Дорожный знак «Пост ГАИ» (1970-е)', 'category_id': 4, 'description': 'Металлический дорожный знак, обозначавший пост Государственной автомобильной инспекции.', 'storage_location_id': 3, 'condition_id': 3, 'acquisition_method_id': 3, 'acquisition_date': '2017-08-20', 'material_ids': [2], 'dating': '1970-е', 'length': 600, 'width': 400},
]

for item in items_data:
    body = json.dumps(item).encode('utf-8')
    req = urllib.request.Request('http://localhost:8000/api/items/', data=body, headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'})
    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())
        print(f'OK: {result["inventory_number"]} - {result["name"]}')
    except Exception as e:
        print(f'ERROR: {item["name"]} - {e}')

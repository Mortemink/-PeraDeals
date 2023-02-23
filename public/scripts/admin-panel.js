const StatesObject = {
    services: {
        selector: document.getElementById('btn-services'),
        action: {
            div: document.querySelector(".create-service"),
            name: document.getElementById("serviceName"),
            description: document.getElementById("serviceDescription"),
            price: document.getElementById("servicePrice"),
        },
    },
    users: {
        selector: document.getElementById('btn-users'),
        action: {
            div: document.querySelector(".find-users"),
            searchField:  document.getElementById("searchField")
        },
    },
    contentDiv: document.getElementById("adminContent")
}

// SERVICE
RenderContent('service', null);
StatesObject.services.selector.addEventListener('click', async () => {
    if (StatesObject.services.selector.classList.contains('activated-button'))
        return;

    StatesObject.services.selector.classList.add('activated-button');
    StatesObject.users.selector.classList.remove('activated-button');

    StatesObject.services.action.div.classList.remove('disabled');
    StatesObject.users.action.div.classList.add('disabled');

    await RenderContent('service', null);
});
//

// USER
StatesObject.users.selector.addEventListener('click', () => {
    if (StatesObject.users.selector.classList.contains('activated-button'))
        return;

    StatesObject.users.selector.classList.add('activated-button');
    StatesObject.services.selector.classList.remove('activated-button');

    StatesObject.users.action.div.classList.remove('disabled');
    StatesObject.services.action.div.classList.add('disabled');

    StatesObject.contentDiv.innerHTML = '';
});
StatesObject.users.action.searchField.addEventListener('input', async (event) => {
    const SearchField = StatesObject.users.action.searchField;

    if (SearchField.value.replaceAll(' ', '').length >= 2)
        await RenderContent('user', SearchField.value.replaceAll(' ', '_'))
})
//

async function RenderContent(type, value) {
    const URL = `/get_info?type=${type}${value !== null ? '&value=' + value : ''}`;
    fetch(URL)
        .then(async data => {
            StatesObject.contentDiv.innerHTML = "";

            data = await data.json();
            console.log(data)
            if (data.length === 0) {
                StatesObject.contentDiv.innerHTML = "Ничего не найдено."
            } else {
                data.forEach(item => {
                    switch (type) {
                        case 'service': {
                            StatesObject.contentDiv.innerHTML +=
                                `<div class="historyItem">
                                    <div class="uslugaName">
                                        <p>Название: ${item.name}</p>
                                    </div>
                                    <div class="uslugaPrice">
                                        <p>Цена: ${item.cost}<span> ₽</span></p>
                                    </div>
                                    <div style="width: 100%; margin-top: 2px; margin-bottom: 2px;"></div> <!-- wrapper -->
                                    <div class="uslugaDescription">Описание: ${item.description}</div>
                                    <button class="uslugaDelete" onclick="">Удалить услугу</button>
                                </div>`;
                            break;
                        }
                        case 'user': {
                            const user =
                                `<div class="userItem" id="${item._id}"> 
                                    <p class="userName">${item.firstname} ${item.lastname}</p>
                                    <p class="userMail">${item.email}</p>
                                    <img src="/img/linkImg.png">
                                </div>`;
                            StatesObject.contentDiv.innerHTML += user;

                            const script = document.createElement('script');
                            script.innerHTML =
                                `
                                     document.getElementById("${item._id}").addEventListener('click', () => { console.log('${item._id}'); });
                                `;
                            document.body.append(script);
                            break;
                        }
                    }
                });
            }
        })
        .catch((err) => {
            if (err)
                console.error(err);

            StatesObject.contentDiv.innerHTML = "Произошла какаято ашипка!";
        });
}